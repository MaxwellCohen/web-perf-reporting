"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, FileJson, Globe, Code } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function JsonInputForm() {
  const [jsonInput, setJsonInput] = useState("")
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [jsonUrl, setJsonUrl] = useState("")
  const [activeTab, setActiveTab] = useState("text")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setJsonFile(e.target.files[0])
      setError(null)
    }
  }

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString)
      return true
    } catch  {
        alert("could not parse data")
      return false
    }
  }

  const fetchJsonFromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON from URL: ${response.statusText}`)
    }
    const data = await response.text()
    if (!validateJson(data)) {
      throw new Error("URL did not return valid JSON")
    }
    return data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      let jsonData = ""

      if (activeTab === "text") {
        if (!jsonInput.trim()) {
          throw new Error("Please enter JSON data")
        }
        if (!validateJson(jsonInput)) {
          throw new Error("Invalid JSON format")
        }
        jsonData = jsonInput
      } else if (activeTab === "file") {
        if (!jsonFile) {
          throw new Error("Please select a JSON file")
        }
        const fileContent = await jsonFile.text()
        if (!validateJson(fileContent)) {
          throw new Error("File does not contain valid JSON")
        }
        jsonData = fileContent
      } else if (activeTab === "url") {
        if (!jsonUrl.trim()) {
          throw new Error("Please enter a URL")
        }
        jsonData = await fetchJsonFromUrl(jsonUrl)
      }

      // Here you would typically process the JSON data
      console.log("Processing JSON data:", JSON.parse(jsonData))

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500))

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Lighthouse Report Viewer</CardTitle>
        <CardDescription>View your Lighthouse Report</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Code size={16} />
                <span>Paste in raw json</span>
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileJson size={16} />
                <span>Lighthouse JSON Export</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Globe size={16} />
                <span> PageSpeed Insights Api</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <div className="space-y-2">
                <Label htmlFor="lh-text">Enter JSON</Label>
                <Textarea
                  id="lh-text"
                  placeholder=''
                  className="min-h-[200px] font-mono"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="file">
              <div className="space-y-2">
                <Label htmlFor="json-file">Lighthouse JSON Export</Label>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Input id="json-file" type="file" accept=".json" onChange={handleFileChange} />
                </div>
                {jsonFile && <p className="text-sm text-muted-foreground mt-2">Selected file: {jsonFile.name}</p>}
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="space-y-2">
                <Label htmlFor="json-url">Url to test</Label>
                <Input
                  id="json-url"
                  type="url"
                  placeholder="https://example.com/"
                  value={jsonUrl}
                  onChange={(e) => setJsonUrl(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 text-green-800 border-green-200">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>JSON data has been successfully processed.</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Processing..." : "Submit"}
        </Button>
      </CardFooter>
    </Card>
  )
}
