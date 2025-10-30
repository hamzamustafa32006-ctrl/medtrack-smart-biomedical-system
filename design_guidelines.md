# Maintenance Alert App - Design Guidelines

## Design Approach
**System**: Custom design system based on provided Visual Style Guide
**Core Principle**: Professional, trustworthy, minimalist interface prioritizing reliability and actionable information for engineers in high-stakes environments.

---

## Color System

### Primary Colors
- **Primary Blue**: `#0057B7` - Main navigation, primary buttons, top bar, active states
- **Accent Orange**: `#FF6D00` - Alerts, notifications, urgent CTAs (use sparingly)

### Secondary Colors
- **Dark Gray**: `#333333` - Body text, subheadings, inactive items
- **Light Gray**: `#F4F4F4` - Backgrounds, cards, containers
- **White**: `#FFFFFF` - Card backgrounds
- **Border Gray**: `#CCCCCC` - Input borders, dividers
- **Placeholder Gray**: `#AAAAAA` - Input placeholders
- **Disabled Gray**: `#CCCCCC` - Disabled states

**Color Usage Rules**:
- Blue for all actionable elements and highlights
- Orange exclusively for urgent alerts and overdue items
- Gray hierarchy for visual separation and reduced noise
- Light backgrounds maximize readability

---

## Typography

### Font Family
**Primary**: Inter or Roboto (load via Google Fonts CDN)

### Type Scale
- **H1**: 32px, Bold (700) - Page titles
- **H2**: 24px, Bold (700) - Section headings
- **H3**: 18px, Bold (700) - Card titles, subsections
- **Body**: 16px, Regular (400) - Primary content, lists, descriptions
- **Small**: 14px, Regular (400) - Secondary content, labels above inputs
- **Caption**: 12px, Medium (500) - Metadata, timestamps, contract dates

**Typography Principles**:
- Prioritize legibility on mobile and tablet
- Maintain consistent hierarchy throughout
- No decorative fonts - professional tone only

---

## Layout System

### Spacing Units (Tailwind)
**Base Unit**: 8px system
- **Primary spacing**: `p-4` (16px), `p-6` (24px), `p-8` (32px)
- **Card padding**: `p-4` standard
- **Section spacing**: `space-y-4` to `space-y-6`
- **Margin system**: `m-2` (8px), `m-4` (16px), `m-6` (24px)

### Responsive Breakpoints
- **Mobile**: 360-414px (base, single column)
- **Tablet**: 768px (`md:`, 2-3 columns possible)
- **Desktop**: 1024px+ (`lg:`, optional admin view)

### Grid System
- Mobile: Single column layout
- Tablet/Desktop: 2-3 column grids for equipment cards and history
- Generous white space between elements

---

## Component Library

### Buttons
**Structure**: Rectangular, 8px border-radius
- **Primary**: Blue background (#0057B7), white text, subtle shadow on hover
- **Secondary**: Light gray background (#F4F4F4), dark gray text (#333333)
- **Disabled**: Gray background (#CCCCCC), light gray text
- **Hover State**: Darker blue (#004499) or subtle shadow
- **Sizes**: Standard height ~44px for touch targets

### Input Fields
**Structure**: Rectangular, 6px border-radius
- **Default Border**: Light gray (#CCCCCC)
- **Focus Border**: Primary blue (#0057B7)
- **Labels**: Above input, 14px regular, dark gray
- **Placeholder**: Light gray (#AAAAAA)
- **Padding**: 12px internal padding

### Cards/Containers
**Structure**: 8px border-radius, white or light gray background
- **Shadow**: Subtle (rgba(0,0,0,0.05)) to lift content
- **Padding**: 16px standard
- **Usage**: Equipment cards, maintenance history, contract details, alert cards

### Navigation
**Mobile**: Bottom tab bar with icons + labels (24px icons)
- Tabs: Alerts, Equipment, History, Settings
- Active state: Primary blue color
- Top bar: Page title centered, optional search icon

**Tablet/Desktop**: Top bar with dropdown or sidebar
- Horizontal navigation or collapsible sidebar
- Consistent with mobile icon set

### Alert Cards
**Structure**: Card with orange left border (4px) for urgent items
- Standard card styling with colored accent
- Icon (24px) + title + timestamp
- Clear visual hierarchy for urgency levels

---

## Iconography

### Icon Library
**Source**: Heroicons (outline style preferred)
**Sizes**: 
- Standard: 24px (navigation, main actions)
- Inline: 16px (within text or small buttons)

**Icon Usage**:
- Equipment types (wrench, cog, hospital)
- Alerts/notifications (bell, exclamation)
- History (clock, calendar)
- Settings (gear)
- Actions (plus, edit, trash)

**Style**: Minimalist outline icons only, no filled or realistic imagery

---

## Screen Layouts

### Dashboard/Alerts Screen
- Top bar with page title "Maintenance Alerts"
- Alert cards in vertical list (most urgent first)
- Each card: Orange accent if urgent, icon, equipment name, alert message, time remaining
- Bottom navigation visible
- Floating action button for quick actions

### Equipment Management
- Search bar at top
- Grid of equipment cards (1 column mobile, 2-3 tablet)
- Each card: Equipment name, ID, last maintenance date, next due date
- Quick actions: View details, edit
- Add equipment button prominent

### Maintenance History
- Filterable timeline view
- History cards chronologically ordered
- Each entry: Date, equipment name, maintenance type, completion status
- Expandable details

### Contract Management
- List view of active contracts
- Card per contract: Vendor name, equipment, start/end dates, status indicator
- Color coding: Orange for expiring soon (<30 days)
- View/edit actions

---

## Data Display Patterns

### Status Indicators
- **Active/Good**: Small blue dot or checkmark
- **Warning**: Orange dot or exclamation (contracts expiring)
- **Overdue**: Orange background highlight with bold text

### Date Formatting
- Absolute dates for history: "Jan 15, 2024"
- Relative dates for alerts: "Due in 5 days" or "Overdue by 2 days"
- Use caption styling (12px medium)

### Empty States
- Centered icon (48px, gray)
- Message in regular body text
- Clear CTA button to add first item

---

## Animations
**Principle**: Minimal, purposeful only
- Page transitions: Simple fade (200ms)
- Card interactions: Subtle hover elevation
- Alert badges: Gentle pulse for new alerts (optional)
- No complex or distracting animations

---

## Accessibility
- Touch targets minimum 44x44px
- High contrast between text and backgrounds
- Clear focus states (blue outline) for keyboard navigation
- ARIA labels on icon-only buttons
- Semantic HTML structure

---

## Images
**Usage**: Minimal to none
- Avoid realistic photos or people imagery
- Use abstract schematic illustrations only for onboarding/empty states
- Focus on icons and clean UI rather than decorative imagery
- No hero images - this is a utility app

---

## Critical Implementation Notes

1. **Maintain 8px spacing system** throughout - no arbitrary margins
2. **Orange accent is sacred** - only for urgent alerts and critical actions
3. **Cards are primary containers** - consistent shadow and radius across app
4. **Mobile-first always** - optimize for 360-414px width primarily
5. **White space is intentional** - reduce cognitive load in high-stress scenarios
6. **Single column mobile layouts** - never squeeze content horizontally
7. **Consistent icon sizes** - 24px standard, 16px inline only
8. **Blue for action, gray for information** - strict color role adherence