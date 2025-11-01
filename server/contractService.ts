// Contract Expiry Detection Service
// Automatically updates contract statuses and creates alerts for expiring contracts

import { db } from "./db";
import { eq, and, lte, sql } from "drizzle-orm";
import { contracts, alerts } from "@shared/schema";

interface ContractUpdateResult {
  expired: number;
  pendingRenewal: number;
  alertsCreated: number;
  errors: string[];
}

/**
 * Main contract expiry detection function
 * Scans all contracts and updates status based on end dates
 */
export async function updateContractStatuses(userId?: string): Promise<ContractUpdateResult> {
  const result: ContractUpdateResult = {
    expired: 0,
    pendingRenewal: 0,
    alertsCreated: 0,
    errors: [],
  };

  try {
    // Build where conditions
    const whereConditions = [];
    if (userId) {
      whereConditions.push(eq(contracts.userId, userId));
    }

    // Query all contracts
    const contractList = await db
      .select({
        id: contracts.id,
        userId: contracts.userId,
        equipmentId: contracts.equipmentId,
        contractNumber: contracts.contractNumber,
        vendorName: contracts.vendorName,
        contractType: contracts.contractType,
        status: contracts.status,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        autoRenew: contracts.autoRenew,
        alertThresholdDays: contracts.alertThresholdDays,
      })
      .from(contracts)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    for (const contract of contractList) {
      try {
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Handle auto-renewal: Extend contract if expired and auto-renew is enabled
        if (daysUntilExpiry < 0 && contract.status === "Active" && contract.autoRenew) {
          // Calculate the original contract term duration
          const originalStartDate = new Date(contract.startDate);
          const originalEndDate = new Date(contract.endDate);
          const contractTermMs = originalEndDate.getTime() - originalStartDate.getTime();
          
          // Guard against zero or negative term durations
          if (contractTermMs <= 0) {
            result.errors.push(`Contract ${contract.id} has invalid term duration (start: ${contract.startDate}, end: ${contract.endDate}). Skipping auto-renewal.`);
            continue;
          }
          
          // Calculate how many terms we need to extend to get past today
          // Use floor + 1 to ensure we extend beyond today, not just to today
          const overdueMs = today.getTime() - originalEndDate.getTime();
          const termsToExtend = Math.floor(overdueMs / contractTermMs) + 1;
          
          // Advance both startDate and endDate by the same amount to preserve term length
          const extensionMs = contractTermMs * termsToExtend;
          const newStartDate = new Date(originalStartDate.getTime() + extensionMs);
          const newEndDate = new Date(originalEndDate.getTime() + extensionMs);
          
          await db
            .update(contracts)
            .set({
              startDate: newStartDate,
              endDate: newEndDate,
              updatedAt: new Date(),
            })
            .where(eq(contracts.id, contract.id));
          
          result.pendingRenewal++;
          
          // Create info alert about auto-renewal
          try {
            await db
              .insert(alerts)
              .values({
                userId: contract.userId,
                entityType: 'contract',
                entityId: contract.id,
                severity: 'info',
                title: `Contract Auto-Renewed: ${contract.vendorName}`,
                message: `${contract.contractType || 'Service'} contract with ${contract.vendorName} has been automatically renewed${termsToExtend > 1 ? ` for ${termsToExtend} term${termsToExtend > 1 ? 's' : ''}` : ''}. New end date: ${newEndDate.toLocaleDateString('en-GB')}.`,
                status: 'open',
                firstTriggeredAt: new Date(),
                escalationLevel: 0,
              })
              .onConflictDoUpdate({
                target: [alerts.entityType, alerts.entityId, alerts.userId],
                targetWhere: sql`status IN ('open', 'escalated')`,
                set: {
                  severity: 'info',
                  message: `${contract.contractType || 'Service'} contract with ${contract.vendorName} has been automatically renewed${termsToExtend > 1 ? ` for ${termsToExtend} term${termsToExtend > 1 ? 's' : ''}` : ''}. New end date: ${newEndDate.toLocaleDateString('en-GB')}.`,
                  updatedAt: new Date(),
                },
              });
            
            result.alertsCreated++;
          } catch (alertError) {
            result.errors.push(`Failed to create alert for auto-renewed contract ${contract.id}: ${alertError}`);
          }
          
          continue; // Skip further processing for this contract
        }
        
        // Update status to Expired if past end date and currently Active (non-auto-renew)
        if (daysUntilExpiry < 0 && contract.status === "Active") {
          await db
            .update(contracts)
            .set({
              status: "Expired",
              updatedAt: new Date(),
            })
            .where(eq(contracts.id, contract.id));
          
          result.expired++;
          
          // Create critical alert for expired contract
          try {
            const daysOverdue = Math.abs(daysUntilExpiry);
            await db
              .insert(alerts)
              .values({
                userId: contract.userId,
                entityType: 'contract',
                entityId: contract.id,
                severity: 'critical',
                title: `Contract Expired: ${contract.vendorName}`,
                message: `${contract.contractType || 'Service'} contract with ${contract.vendorName} expired ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago. ${contract.contractNumber ? `Contract #${contract.contractNumber}` : 'Immediate renewal required.'  }`,
                status: 'open',
                firstTriggeredAt: new Date(),
                escalationLevel: 0,
              })
              .onConflictDoUpdate({
                target: [alerts.entityType, alerts.entityId, alerts.userId],
                targetWhere: sql`status IN ('open', 'escalated')`,
                set: {
                  severity: 'critical',
                  message: `${contract.contractType || 'Service'} contract with ${contract.vendorName} expired ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago. ${contract.contractNumber ? `Contract #${contract.contractNumber}` : 'Immediate renewal required.'}`,
                  updatedAt: new Date(),
                },
              });
            
            result.alertsCreated++;
          } catch (alertError) {
            result.errors.push(`Failed to create alert for expired contract ${contract.id}: ${alertError}`);
          }
        } else if (daysUntilExpiry >= 0 && daysUntilExpiry <= contract.alertThresholdDays && contract.status === "Active") {
          // Update status to Pending Renewal if within alert threshold
          await db
            .update(contracts)
            .set({
              status: "Pending Renewal",
              updatedAt: new Date(),
            })
            .where(eq(contracts.id, contract.id));
          
          result.pendingRenewal++;
          
          // Create warning/critical alert for contract expiring soon
          try {
            const severity = daysUntilExpiry <= 7 ? 'critical' : 'warning';
            await db
              .insert(alerts)
              .values({
                userId: contract.userId,
                entityType: 'contract',
                entityId: contract.id,
                severity,
                title: `Contract Expiring: ${contract.vendorName}`,
                message: `${contract.contractType || 'Service'} contract with ${contract.vendorName} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. ${contract.autoRenew ? 'Auto-renewal is enabled.' : 'Please review and renew.'}`,
                status: 'open',
                firstTriggeredAt: new Date(),
                escalationLevel: 0,
              })
              .onConflictDoUpdate({
                target: [alerts.entityType, alerts.entityId, alerts.userId],
                targetWhere: sql`status IN ('open', 'escalated') AND (
                  severity != 'critical' OR ${severity === 'critical'}
                )`,
                set: {
                  severity,
                  message: `${contract.contractType || 'Service'} contract with ${contract.vendorName} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. ${contract.autoRenew ? 'Auto-renewal is enabled.' : 'Please review and renew.'}`,
                  updatedAt: new Date(),
                },
              });
            
            result.alertsCreated++;
          } catch (alertError) {
            result.errors.push(`Failed to create alert for contract ${contract.id}: ${alertError}`);
          }
        }
      } catch (contractError) {
        result.errors.push(`Failed to process contract ${contract.id}: ${contractError}`);
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error in contract status update: ${error}`);
  }

  return result;
}
