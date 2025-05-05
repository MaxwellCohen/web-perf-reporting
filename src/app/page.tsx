import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-4">Web Performance Reports</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {`Comprehensive insights into your website's performance using Chrome UX Report (CrUX) data and PageSpeed metrics`}
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <HomeCard
          title="Latest CrUX Metrics"
          description="Analyze actual user experience data from Chrome UX Report"
          content="Get insights into Core Web Vitals and other key performance metrics based on real user data."
          url="/latest-crux"
          linkText="View Latest CrUX Data"
        />

        <HomeCard
          title="Historical Trends"
          description="Track performance changes over time"
          content="Monitor how your website's performance evolves with historical CrUX data analysis."
          url="/historical-crux"
          linkText="View Historical Data"
        />

        <HomeCard
          title="PageSpeed Insights"
          description="Lab data and optimization recommendations"
          content="Get detailed performance audits and actionable recommendations to improve your site."
          url="/page-speed"
          linkText="Run PageSpeed Analysis"
        />
        
        <HomeCard
          title="Lighthouse report viewer"
          description="View Lighthouse reports from your Experiments"
          content="Visualize LCP, FID, CLS, and INP metrics with detailed breakdowns and pass/fail indicators."
          url="/viewer"
          linkText="Go to Lighthouse Report Viewer"
        />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Why Monitor Web Performance?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4">
            <h3 className="font-semibold mb-2">User Experience</h3>
            <p className="text-muted-foreground">Better performance leads to improved user satisfaction and engagement</p>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">SEO Rankings</h3>
            <p className="text-muted-foreground">Core Web Vitals affect your search engine rankings</p>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Conversion Rates</h3>
            <p className="text-muted-foreground">Faster sites have higher conversion rates and lower bounce rates</p>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Mobile Performance</h3>
            <p className="text-muted-foreground">Optimize for mobile users with device-specific metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}


function HomeCard({
    title,
    description,
    content,
    url,
    linkText,

}: {
title: string,
description: string,
content: string,
url: string,
linkText: string,
}) {
  
  return(
    <Card className="h-full flex flex-col">
          <CardHeader className='flex-1'>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{content}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href={url}>
                {linkText}
              </Link>
            </Button>
          </CardContent>
        </Card>
  )
}