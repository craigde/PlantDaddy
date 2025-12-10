import React, { useState } from 'react';
import { Plant } from '@shared/schema';
import { DayPicker, DayContent } from 'react-day-picker';
import { addDays, format, isSameDay, isToday, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Droplet, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PlantCalendarViewProps {
  plants: Plant[];
  onPlantWatered: (plantId: number) => void;
}

interface PlantWateringDay {
  date: Date;
  plantIds: number[];
}

export function PlantCalendarView({ plants, onPlantWatered }: PlantCalendarViewProps) {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  
  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center p-4">
        <p className="text-lg text-muted-foreground">No plants added yet.</p>
        <p className="text-sm text-muted-foreground">
          Add your first plant using the + button below.
        </p>
      </div>
    );
  }

  // Generate watering dates for each plant
  const wateringDays = plants.reduce<PlantWateringDay[]>((days, plant) => {
    if (!plant.lastWatered) return days;
    
    // Calculate next watering date
    const lastWatered = new Date(plant.lastWatered);
    const nextWateringDate = addDays(lastWatered, plant.wateringFrequency);
    
    // Find if this date already exists in our array
    const existingDay = days.find(day => isSameDay(day.date, nextWateringDate));
    
    if (existingDay) {
      // Add this plant to the existing day
      existingDay.plantIds.push(plant.id);
    } else {
      // Create a new day with this plant
      days.push({
        date: nextWateringDate,
        plantIds: [plant.id]
      });
    }
    
    return days;
  }, []);

  // Get plants for a specific date
  const getPlantsForDate = (date: Date) => {
    const matchingDay = wateringDays.find(day => isSameDay(day.date, date));
    if (!matchingDay) return [];
    
    return plants.filter(plant => matchingDay.plantIds.includes(plant.id));
  };

  // Component to render the day cell with plant indicators
  const renderDay = (day: Date) => {
    const plantsForDay = getPlantsForDate(day);
    const count = plantsForDay.length;
    
    if (count === 0) return null;
    
    return (
      <div className="relative">
        <div className="absolute bottom-0 right-0 h-2 w-2 bg-primary rounded-full" />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-4">
      <style>{`
        .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .rdp-day_today {
          background-color: hsl(var(--muted));
          font-weight: bold;
        }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
          background-color: hsl(var(--accent));
        }
      `}</style>
      
      <DayPicker
        mode="multiple"
        showOutsideDays
        month={month}
        onMonthChange={setMonth}
        modifiers={{
          booked: wateringDays.map(day => day.date)
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          DayContent: (props) => (
            <div className="relative">
              <DayContent {...props} />
              {wateringDays.some(day => isSameDay(day.date, props.date)) && renderDay(props.date)}
            </div>
          ),
        }}
        styles={{
          caption: { display: 'flex', justifyContent: 'space-between', margin: '0 auto' },
          caption_label: { fontSize: '1.2rem', fontWeight: 'bold' },
          table: { width: '100%' },
          head_cell: { 
            width: '2.5rem', 
            height: '2.5rem',
            fontWeight: 'normal',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '0.875rem'
          },
          cell: { 
            width: '2.5rem', 
            height: '2.5rem',
            position: 'relative' 
          },
          nav: { display: 'flex', justifyContent: 'space-between' }
        }}
        footer={
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Dots indicate days when plants need water
          </div>
        }
      />

      <div className="mt-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4">Today's Watering Schedule</h3>
        {getPlantsForDate(new Date()).length > 0 ? (
          getPlantsForDate(new Date()).map(plant => (
            <div 
              key={plant.id} 
              className="flex items-center justify-between p-3 mb-2 border rounded-md"
            >
              <span className="font-medium">{plant.name}</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onPlantWatered(plant.id)}
              >
                <Droplet className="mr-2 h-4 w-4" />
                Water
              </Button>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">No plants to water today</p>
        )}
      </div>
    </div>
  );
}