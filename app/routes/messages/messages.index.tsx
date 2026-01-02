import { Button } from "~/components/ui/button";

export default function MessagesIndex() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
            <div className="max-w-[340px] flex flex-col gap-2">
                <h2 className="text-3xl font-black leading-tight">메시지 선택</h2>
                <p className="text-muted-foreground">
                    기본 대화에서 선택하거나 새로운 대화를 시작하고 싶으신가요? 기존 대화를 선택하거나 새 메시지를 작성해 보세요.
                </p>
                <div className="mt-6">
                    <Button size="lg" className="rounded-full font-bold px-8">
                        새 메시지 작성
                    </Button>
                </div>
            </div>
        </div>
    );
}
