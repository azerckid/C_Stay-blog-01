/// <reference types="google.maps" />
import { useState, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, Search01Icon as SearchIcon } from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

export interface LocationData {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    placeId: string;
    country?: string;
    city?: string;
}

interface LocationPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLocationSelect: (location: LocationData) => void;
}

export function LocationPickerDialog({ open, onOpenChange, onLocationSelect }: LocationPickerDialogProps) {
    const placesLib = useMapsLibrary("places");
    const [service, setService] = useState<google.maps.places.AutocompleteService | null>(null);
    const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
    const [query, setQuery] = useState("");
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!placesLib) return;
        setService(new placesLib.AutocompleteService());
        // PlacesService requires a DOM element (usually a map or div). We can create a dummy div.
        const dummyDiv = document.createElement("div");
        setPlacesService(new placesLib.PlacesService(dummyDiv));
    }, [placesLib]);

    useEffect(() => {
        if (!service || !query) {
            setPredictions([]);
            return;
        }

        // Debounce or just call (Google charges per session/char?). Autocomplete session token is recommended.
        // For simplicity, simple debounce.
        const timer = setTimeout(() => {
            setIsLoading(true);
            service.getPlacePredictions({ input: query }, (results: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
                setIsLoading(false);
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                } else {
                    setPredictions([]);
                }
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [query, service]);

    const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
        if (!placesService) return;

        const placeId = prediction.place_id;
        placesService.getDetails({
            placeId: placeId,
            fields: ['name', 'geometry', 'formatted_address', 'address_components']
        }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                // Address Components extraction
                let country = "";
                let city = "";

                place.address_components?.forEach((comp: google.maps.GeocoderAddressComponent) => {
                    if (comp.types.includes("country")) {
                        country = comp.long_name;
                    }
                    if (comp.types.includes("locality")) {
                        city = comp.long_name;
                    } else if (!city && comp.types.includes("administrative_area_level_1")) {
                        city = comp.long_name; // Fallback for city usually works well
                    }
                });

                const locationData: LocationData = {
                    name: place.name || prediction.structured_formatting.main_text,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                    address: place.formatted_address || "",
                    placeId: placeId,
                    country,
                    city
                };

                onLocationSelect(locationData);
                onOpenChange(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle>위치 추가</DialogTitle>
                </DialogHeader>
                <div className="p-4 pt-0">
                    <div className="relative">
                        <HugeiconsIcon icon={SearchIcon} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="어디에 계신가요?"
                            className="pl-9"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto border-t border-border">
                    {isLoading && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            검색 중...
                        </div>
                    )}

                    {!isLoading && predictions.length === 0 && query && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            검색 결과가 없습니다.
                        </div>
                    )}

                    {!isLoading && predictions.length === 0 && !query && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            장소 이름을 입력하세요.
                        </div>
                    )}

                    {predictions.map((prediction) => (
                        <button
                            key={prediction.place_id}
                            onClick={() => handleSelect(prediction)}
                            className="w-full text-left p-4 hover:bg-accent transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
                        >
                            <div className="bg-secondary p-2 rounded-full shrink-0">
                                <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold truncate">{prediction.structured_formatting.main_text}</span>
                                <span className="text-xs text-muted-foreground truncate">{prediction.structured_formatting.secondary_text}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
