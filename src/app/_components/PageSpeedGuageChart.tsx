"use client"
import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { chartConfig } from "./ChartSettings"



const RADIAN = Math.PI / 180;
const chartData = [
    { name: chartConfig['good'].label, value: 10, fill: "var(--color-good)" },
    { name: chartConfig['ni'].label, value: 40, fill: "var(--color-ni)" },
    { name: chartConfig['poor'].label, value: 50, fill: "var(--color-poor)" },
];

const Needle = ({
    value,
    data,
    cx,
    cy,
    iR,
    oR,
    color
}: {
    value: number,
    data: typeof chartData,
    cx: number,
    cy: number,
    iR: number,
    oR: number,
    color: string
}
) => {

    const ang = 180.0 * (1 - (value / 100));
    const length = (iR + oR) / 2;
    const sin = Math.sin(-RADIAN * ang);
    const cos = Math.cos(-RADIAN * ang);
    const r = 5;
    const x0 = cx;
    const y0 = cy;
    const xba = x0 + r * sin;
    const yba = y0 - r * cos;
    const xbb = x0 - r * sin;
    const ybb = y0 + r * cos;
    const xp = x0 + length * cos;
    const yp = y0 + length * sin;
    return (
        <>
            <circle cx={x0} cy={y0} r={r} fill={color} stroke="none" />
            <path d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`} stroke="#none" fill={color} />
        </>
    );
};


export function GaugeChart({ metric, value }: { metric: string, value: number }) {
    return (
    
            <ChartContainer config={chartConfig} className="mx-auto aspect-[2/1] max-h-[250px] min-w-[200px]">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={chartData}
                        order={0}
                        dataKey="value"
                        nameKey="name"
                        startAngle={0}
                        endAngle={180}
                        innerRadius={'50%'}
                        strokeWidth={5}
                    >
                        <Label
                            content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    console.log(viewBox);
                                    const ang = 180.0 * (1 - (value / 100));
                                    const length = ((viewBox.innerRadius || 0) as number + (viewBox.outerRadius || 0) as number) / 2;
                                    const sin = Math.sin(-RADIAN * ang);
                                    const cos = Math.cos(-RADIAN * ang);
                                    const r = 5;
                                    const x0 = viewBox.cx as number;
                                    const y0 = viewBox.cy as number;
                                    const xba = x0 + r * sin;
                                    const yba = y0 - r * cos;
                                    const xbb = x0 - r * sin;
                                    const ybb = y0 + r * cos;
                                    const xp = x0 + length * cos;
                                    const yp = y0 + length * sin;

                                    return (<>
                                        <path d={`M ${xba} ${yba} L ${xbb} ${ybb} L ${xp} ${yp} `} stroke="#d0d000" fill={'#d0d000'} />
                                        <circle cx={x0} cy={y0} r={5} stroke="#d0d000" fill={'#d0d000'} />
                                        <text
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            textAnchor="middle"
                                            dominantBaseline={"middle"}
                                        >
                                            <tspan
                                                x={viewBox.cx}
                                                y={viewBox.cy as number + 24}
                                                className="fill-foreground text-lg font-bold"
                                            >
                                                {value.toLocaleString()}
                                            </tspan>
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 40}
                                                className="fill-muted-foreground"
                                            >
                                                {metric}
                                            </tspan>
                                        </text>
                                    </>);
                                }
                            }}
                        />
                    </Pie>
                </PieChart>
            </ChartContainer>
    )
}

export default GaugeChart;
