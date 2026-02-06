import { Plant } from "@shared/schema";
import { daysUntilWatering, isOverdue } from "./date-utils";

export type PlantStatus = "watered" | "soon" | "overdue";

// Determine if a plant needs watering
export const getPlantStatus = (plant: Plant): PlantStatus => {
  if (isToday(plant.lastWatered)) {
    return "watered";
  }

  if (isOverdue(plant.lastWatered, plant.wateringFrequency, plant.snoozedUntil)) {
    return "overdue";
  }

  const daysUntil = daysUntilWatering(plant.lastWatered, plant.wateringFrequency, plant.snoozedUntil);
  if (daysUntil <= 3) {
    return "soon";
  }

  return "watered";
};

// Get formatted status text for a plant
export const getStatusText = (plant: Plant): string => {
  const status = getPlantStatus(plant);

  if (status === "watered" && isToday(plant.lastWatered)) {
    return "Watered today";
  }

  if (status === "overdue") {
    const days = Math.abs(daysUntilWatering(plant.lastWatered, plant.wateringFrequency, plant.snoozedUntil));
    if (days === 0) {
      return "Due today";
    }
    return `Overdue ${days} ${days === 1 ? 'day' : 'days'}`;
  }

  if (status === "soon") {
    const days = daysUntilWatering(plant.lastWatered, plant.wateringFrequency, plant.snoozedUntil);
    if (days === 0) {
      return "Due today";
    }
    if (days === 1) {
      return "Due tomorrow";
    }
    return `Due in ${days} days`;
  }

  return "";
};

// Group plants by status
export const groupPlantsByStatus = (plants: Plant[]) => {
  const plantsToWaterToday: Plant[] = [];
  const upcomingPlants: Plant[] = [];
  const recentlyWatered: Plant[] = [];
  
  plants.forEach(plant => {
    const status = getPlantStatus(plant);

    if (status === "overdue" || (status === "soon" && daysUntilWatering(plant.lastWatered, plant.wateringFrequency, plant.snoozedUntil) === 0)) {
      plantsToWaterToday.push(plant);
    } else if (status === "soon") {
      upcomingPlants.push(plant);
    } else if (status === "watered") {
      recentlyWatered.push(plant);
    }
  });
  
  return {
    plantsToWaterToday,
    upcomingPlants,
    recentlyWatered
  };
};

// Helper function to check if a date is today
function isToday(date: Date | string): boolean {
  // Ensure we have a Date object
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  
  // Check if date is valid before trying to use getDate()
  if (isNaN(dateObj.getTime())) {
    console.error("Invalid date in isToday function:", date);
    return false;
  }
  
  return dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear();
}

// This function is kept for backward compatibility
// but is no longer used directly
export const getAvailableLocations = (): string[] => [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Office",
  "Balcony",
  "Dining Room",
  "Hallway",
  "Porch",
  "Patio"
];

// Get watering frequency options
export const getWateringFrequencies = (): {value: number, label: string}[] => [
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 4, label: "4 days" },
  { value: 5, label: "5 days" },
  { value: 6, label: "6 days" },
  { value: 7, label: "7 days" },
  { value: 10, label: "10 days" },
  { value: 14, label: "14 days" },
  { value: 21, label: "21 days" },
  { value: 30, label: "30 days" }
];
