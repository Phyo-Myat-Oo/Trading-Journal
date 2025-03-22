# Date Filter Component

This is a comprehensive date filtering component for the Trading Journal application. It includes:

1. Preset date range buttons (Today, Yesterday, This Week, etc.)
2. A visual date range slider with markers
3. Integration with the existing DateRangePicker component
4. Responsive design for mobile and desktop views

## Components

- `DateFilterContainer`: Main container that integrates DateRangePicker with advanced filtering
- `DateFilter`: Handles presets and slider integration
- `PresetButtonGroup`: UI for date range preset buttons
- `DateRangeSlider`: Visual slider with markers for date selection
- `DateRangePicker`: Original date picker component (now integrated)

## Usage Example

### Basic Implementation

```tsx
import React, { useState } from 'react';
import { DateFilterContainer } from './components/DateRangePicker/DateFilterContainer';

const MyComponent: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7); // Default to last 7 days
    return [start, end];
  });

  const handleDateRangeChange = (newRange: [Date, Date]) => {
    setDateRange(newRange);
    // Your logic to handle date range changes (e.g., fetch data for the new range)
  };

  return (
    <div>
      <DateFilterContainer 
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      
      {/* Your component's content that uses the date range */}
    </div>
  );
};
```

### In the Header

The component is already integrated into the Header component, where it will automatically use the compact version on mobile:

```tsx
<Header 
  dateRange={dateRange}
  onDateRangeChange={handleDateRangeChange}
  onMenuClick={toggleSidebar}
/>
```

## Features

- **Preset Date Ranges**: Quickly select common date ranges like Today, This Week, Last Month, etc.
- **Visual Slider**: Drag handles to adjust date ranges with visual markers
- **Responsive Design**: Adapts to mobile (compact) and desktop views
- **Consistent Styling**: Matches the application's dark theme

## Props

### DateFilterContainer Props

| Prop | Type | Description |
|------|------|-------------|
| `dateRange` | `[Date, Date]` | The currently selected date range |
| `onDateRangeChange` | `(range: [Date, Date]) => void` | Callback when date range changes |
| `compact` | `boolean` | Use compact mode for mobile (default: false) |

## Dependencies

- date-fns: For date manipulation
- @radix-ui/react-slider: For the slider component
- react-icons: For UI icons

## Installation

Ensure you have the required dependencies:

```bash
npm install date-fns @radix-ui/react-slider react-icons
# or
yarn add date-fns @radix-ui/react-slider react-icons
``` 