import { data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { prisma } from "~/lib/prisma.server";

export async function loader({ params }: LoaderFunctionArgs) {
    const { userId } = params;

    if (!userId) {
        return data({ error: "User ID is required" }, { status: 400 });
    }

    // 사용자의 모든 여행 트윗 조회 (위치 정보가 있는 트윗만)
    const travelTweets = await prisma.tweet.findMany({
        where: {
            userId,
            deletedAt: null,
            OR: [
                { country: { not: null } },
                { city: { not: null } }
            ]
        },
        select: {
            id: true,
            country: true,
            city: true,
            travelDate: true,
            createdAt: true,
        },
        orderBy: {
            travelDate: "desc"
        }
    });

    // 방문 국가 집계
    const countries = new Set<string>();
    const cities = new Set<string>();
    const countryVisits: Record<string, number> = {};
    const yearlyStats: Record<string, number> = {};
    const monthlyStats: Record<string, number> = {};

    travelTweets.forEach(tweet => {
        const country = tweet.country;
        const city = tweet.city;

        if (country) {
            countries.add(country);
            countryVisits[country] = (countryVisits[country] || 0) + 1;
        }

        if (city) {
            cities.add(city);
        }

        // 연도별 통계
        const date = tweet.travelDate || tweet.createdAt;
        const year = new Date(date).getFullYear().toString();
        yearlyStats[year] = (yearlyStats[year] || 0) + 1;

        // 월별 통계
        const month = `${year}-${String(new Date(date).getMonth() + 1).padStart(2, '0')}`;
        monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });

    // 가장 많이 방문한 국가 Top 5
    const topCountries = Object.entries(countryVisits)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }));

    // 총 여행 일수 계산 (중복 날짜 제거)
    const uniqueDates = new Set(
        travelTweets
            .map(t => {
                const date = t.travelDate || t.createdAt;
                return new Date(date).toISOString().split('T')[0];
            })
    );

    return data({
        stats: {
            totalCountries: countries.size,
            totalCities: cities.size,
            totalTravelDays: uniqueDates.size,
            totalTravelPosts: travelTweets.length,
            topCountries,
            yearlyStats: Object.entries(yearlyStats)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([year, count]) => ({ year, count })),
            monthlyStats: Object.entries(monthlyStats)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 12) // 최근 12개월
                .map(([month, count]) => ({ month, count })),
            countries: Array.from(countries).sort(),
        }
    });
}
