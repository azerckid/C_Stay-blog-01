import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { signUp } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Mail, Lock, User, Loader2 } from "lucide-react";

const signupSchema = z.object({
    name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
    email: z.string().email("유효한 이메일을 입력해주세요."),
    password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (values: SignupFormValues) => {
        setIsLoading(true);
        try {
            const { error } = await signUp.email({
                email: values.email,
                password: values.password,
                name: values.name,
                callbackURL: "/",
            });

            if (error) {
                toast.error(error.message || "회원가입에 실패했습니다.");
            } else {
                toast.success("회원가입이 완료되었습니다! 환영합니다 ✨");
                navigate("/");
            }
        } catch (err) {
            toast.error("알 수 없는 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative z-10">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">시작하기 🚀</CardTitle>
                    <CardDescription className="text-slate-400">
                        STAYnC의 새로운 멤버가 되어 여행을 기록해 보세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-300">이름</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="홍길동"
                                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-blue-500/50"
                                    {...register("name")}
                                />
                            </div>
                            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">이메일</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-blue-500/50"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-blue-500/50"
                                    {...register("password")}
                                />
                            </div>
                            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 transition-all duration-300" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "계정 만들기"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-center gap-1 border-white/10 bg-white/5 py-4">
                    <span className="text-sm text-slate-400">이미 계정이 있으신가요?</span>
                    <Link to="/login" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                        로그인하기
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
