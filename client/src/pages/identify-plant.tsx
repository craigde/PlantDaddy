import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Plant to identify"
                    className="w-full h-48 object-cover"
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

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectSpecies(result)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
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
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Tap a result to add it as a new plant
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
