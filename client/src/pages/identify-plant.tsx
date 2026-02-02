import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { usePlantSpecies } from "@/hooks/use-plant-species";
import { useQuery } from "@tanstack/react-query";
import type { PlantSpecies } from "@shared/schema";

interface IdentifyResult {
  score: number;
  scientificName: string;
  commonNames: string[];
  family: string;
  genus: string;
}

interface IdentifyResponse {
  bestMatch: string | null;
  results: IdentifyResult[];
  remainingRequests: number;
}

export default function IdentifyPlant() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [results, setResults] = useState<IdentifyResponse | null>(null);
  const [organ, setOrgan] = useState<string>("auto");
  const [addingToExplorer, setAddingToExplorer] = useState<string | null>(null);

  const { addPlantSpecies } = usePlantSpecies();

  // Fetch existing species catalog to check for duplicates
  const { data: existingSpecies } = useQuery<PlantSpecies[]>({
    queryKey: ['plant-species'],
    enabled: !!results,
  });

  const isSpeciesInCatalog = (scientificName: string): boolean => {
    if (!existingSpecies) return false;
    return existingSpecies.some(
      (s) => s.scientificName.toLowerCase() === scientificName.toLowerCase()
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 10MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleIdentify = async () => {
    if (!selectedFile) return;

    setIsIdentifying(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("organ", organ);

      const res = await fetch("/api/identify-plant", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Identification failed" }));
        throw new Error(error.message || "Identification failed");
      }

      const data: IdentifyResponse = await res.json();
      setResults(data);

      if (data.results.length === 0) {
        toast({
          title: "No matches found",
          description: "Try a clearer photo of leaves or flowers.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Identification failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSelectSpecies = (result: IdentifyResult) => {
    const displayName = result.commonNames.length > 0 ? result.commonNames[0] : result.scientificName;
    const params = new URLSearchParams({
      name: displayName,
      species: result.scientificName,
    });
    navigate(`/plants/new?${params.toString()}`);
  };

  const handleAddToExplorer = async (result: IdentifyResult) => {
    const displayName = result.commonNames.length > 0 ? result.commonNames[0] : result.scientificName;
    setAddingToExplorer(result.scientificName);

    try {
      // Step 1: Generate care details via Claude API
      toast({ title: "Generating care details...", description: `Using AI to research ${displayName}` });

      const detailsRes = await fetch("/api/generate-species-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scientificName: result.scientificName,
          commonName: displayName,
          family: result.family,
        }),
      });

      if (!detailsRes.ok) {
        const err = await detailsRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate species details");
      }

      const speciesDetails = await detailsRes.json();

      // Step 2: Generate illustration via DALL-E
      toast({ title: "Generating illustration...", description: `Creating artwork for ${displayName}` });

      const imageRes = await fetch("/api/generate-species-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: speciesDetails.name || displayName,
          scientificName: result.scientificName,
        }),
      });

      let imageUrl: string | null = null;
      if (imageRes.ok) {
        const imageData = await imageRes.json();
        imageUrl = imageData.imageUrl;
      } else {
        const err = await imageRes.json().catch(() => ({}));
        const reason = err.message || `HTTP ${imageRes.status}`;
        console.warn("Image generation failed:", reason);
        toast({
          title: "Illustration skipped",
          description: reason,
          variant: "destructive",
        });
      }

      // Step 3: Create species in catalog
      const newSpecies = {
        name: speciesDetails.name || displayName,
        scientificName: speciesDetails.scientificName || result.scientificName,
        family: speciesDetails.family || result.family || null,
        origin: speciesDetails.origin || null,
        description: speciesDetails.description || `${displayName} is a plant species in the ${result.family} family.`,
        careLevel: speciesDetails.careLevel || "moderate",
        lightRequirements: speciesDetails.lightRequirements || "Bright indirect light",
        wateringFrequency: speciesDetails.wateringFrequency || 7,
        humidity: speciesDetails.humidity || null,
        soilType: speciesDetails.soilType || null,
        propagation: speciesDetails.propagation || null,
        toxicity: speciesDetails.toxicity || null,
        commonIssues: speciesDetails.commonIssues || null,
        imageUrl: imageUrl,
        userId: null,
      };

      await addPlantSpecies.mutateAsync(newSpecies as any);

      toast({
        title: "Added to Explorer!",
        description: `${newSpecies.name} has been added to the plant catalog with AI-generated care details and illustration.`,
      });
    } catch (error: any) {
      console.error("Error adding to explorer:", error);
      toast({
        title: "Failed to add to Explorer",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToExplorer(null);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const organOptions = [
    { value: "auto", label: "Auto-detect" },
    { value: "leaf", label: "Leaf" },
    { value: "flower", label: "Flower" },
    { value: "fruit", label: "Fruit" },
    { value: "bark", label: "Bark" },
  ];

  return (
    <div>
      <div className="bg-card p-4 shadow-sm">
        <div className="flex items-center mb-2">
          <Button variant="ghost" onClick={() => navigate("/")} className="mr-2">
            <span className="material-icons">arrow_back</span>
          </Button>
          <h1 className="text-xl font-bold font-heading">Identify Plant</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-2">
          Take a photo of a plant to identify its species
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Photo capture area */}
        <Card>
          <CardContent className="p-4">
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <span className="material-icons text-4xl text-muted-foreground mb-2 block">
                  camera_alt
                </span>
                <p className="text-muted-foreground font-medium">Tap to take or select a photo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Best results with clear photos of leaves or flowers
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden max-w-sm mx-auto">
                  <img
                    src={imagePreview}
                    alt="Plant to identify"
                    className="w-full max-h-64 object-contain"
                  />
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>

                {/* Organ selector */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">What part of the plant is shown?</p>
                  <div className="flex flex-wrap gap-2">
                    {organOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setOrgan(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          organ === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Identify button */}
                <Button
                  onClick={handleIdentify}
                  disabled={isIdentifying}
                  className="w-full"
                  size="lg"
                >
                  {isIdentifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Identifying...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-sm mr-2">search</span>
                      Identify Plant
                    </>
                  )}
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Results */}
        {results && results.results.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-3 font-heading">Species Matches</h2>
              <div className="space-y-3">
                {results.results.map((result, index) => {
                  const confidence = Math.round(result.score * 100);
                  const displayName = result.commonNames.length > 0 ? result.commonNames[0] : result.scientificName;
                  const inCatalog = isSpeciesInCatalog(result.scientificName);
                  const isAdding = addingToExplorer === result.scientificName;

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-border"
                    >
                      <button
                        onClick={() => handleSelectSpecies(result)}
                        className="w-full text-left hover:bg-accent/50 rounded transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{displayName}</p>
                            <p className="text-sm text-muted-foreground italic truncate">
                              {result.scientificName}
                            </p>
                            {result.family && (
                              <p className="text-xs text-muted-foreground">
                                Family: {result.family}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 flex items-center">
                            <div
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                confidence >= 70
                                  ? "bg-green-100 text-green-800"
                                  : confidence >= 40
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {confidence}%
                            </div>
                            <span className="material-icons text-muted-foreground ml-2">
                              chevron_right
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Add to Explorer button */}
                      <div className="mt-2 pt-2 border-t border-border/50">
                        {inCatalog ? (
                          <p className="text-xs text-muted-foreground flex items-center">
                            <span className="material-icons text-green-600 text-sm mr-1">check_circle</span>
                            Already in Plant Explorer
                          </p>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToExplorer(result);
                            }}
                            disabled={isAdding || !!addingToExplorer}
                            className="w-full text-xs"
                          >
                            {isAdding ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Adding to Explorer...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1.5" />
                                Add to Explorer with AI
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Tap a result to add as a plant, or add to Explorer catalog
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
