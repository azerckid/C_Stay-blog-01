import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tag01Icon, PlusSignIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "~/components/ui/badge";

interface TagPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTagsSelected: (tags: string[]) => void;
    initialTags?: string[];
}

export function TagPickerDialog({ open, onOpenChange, onTagsSelected, initialTags = [] }: TagPickerDialogProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<{ id: string, name: string, slug: string }[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedTags(initialTags);
            setQuery("");
            setSuggestions([]);
        }
    }, [open, initialTags]);

    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            setIsLoading(true);
            fetch(`/api/tags?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => {
                    setSuggestions(data.tags || []);
                })
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleAddTag = (tagName: string) => {
        if (!selectedTags.includes(tagName)) {
            setSelectedTags([...selectedTags, tagName]);
        }
        setQuery("");
        setSuggestions([]);
    };

    const handleRemoveTag = (tagName: string) => {
        setSelectedTags(selectedTags.filter(t => t !== tagName));
    };

    const handleConfirm = () => {
        onTagsSelected(selectedTags);
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) {
            e.preventDefault();
            handleAddTag(query.trim());
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground">여행 태그 추가</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Selected Tags Area */}
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-border rounded-md bg-muted/30">
                        {selectedTags.length === 0 && (
                            <span className="text-muted-foreground text-sm flex items-center h-full">선택된 태그가 없습니다.</span>
                        )}
                        {selectedTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                #{tag}
                                <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                                    <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="relative">
                        <HugeiconsIcon icon={Tag01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="태그 검색 또는 생성 (Enter)"
                            className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* Suggestions Area */}
                    {query && (
                        <div className="border border-border rounded-md overflow-hidden max-h-[200px] overflow-y-auto bg-background">
                            {isLoading ? (
                                <div className="p-3 text-center text-sm text-muted-foreground">검색 중...</div>
                            ) : (
                                <>
                                    {suggestions.length > 0 ? (
                                        suggestions.map(tag => (
                                            <button
                                                key={tag.id}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                                                onClick={() => handleAddTag(tag.name)}
                                            >
                                                <HugeiconsIcon icon={Tag01Icon} className="h-3 w-3 text-muted-foreground" />
                                                <span>{tag.name}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">기존 태그</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            "{query}" 태그를 찾을 수 없습니다.
                                            <button
                                                className="w-full text-left px-2 py-1 mt-1 text-primary hover:underline flex items-center gap-1"
                                                onClick={() => handleAddTag(query)}
                                            >
                                                <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
                                                새로 추가하기
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={handleConfirm}>완료</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
