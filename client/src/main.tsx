import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Material Icons
const link = document.createElement('link');
link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
link.rel = "stylesheet";
document.head.appendChild(link);

// Add fonts
const fontLink = document.createElement('link');
fontLink.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Open+Sans:wght@400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Add title
const title = document.createElement('title');
title.textContent = "PlantCare - Track Your Indoor Plants";
document.head.appendChild(title);

// Add meta description
const metaDesc = document.createElement('meta');
metaDesc.name = "description";
metaDesc.content = "Track your houseplants and get notified when they need watering";
document.head.appendChild(metaDesc);

createRoot(document.getElementById("root")!).render(<App />);
