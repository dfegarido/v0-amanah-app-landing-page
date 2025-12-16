"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Mail, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { emailTemplates, emailLogs } from "@/lib/mock-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AdminEmailsPage() {
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState(emailTemplates[0])
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Template saved",
        description: "Email template has been updated successfully.",
      })
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "default"
      case "failed":
        return "destructive"
      case "pending":
        return "secondary"
      default:
        return "default"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Email Management</h1>
              <p className="text-sm text-muted-foreground">Manage email templates and view sent emails</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
            <TabsTrigger value="logs">Email Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Template List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>Select a template to edit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {emailTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate.id === template.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {template.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Template Editor */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input defaultValue={selectedTemplate.subject} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea rows={15} defaultValue={selectedTemplate.body} className="font-mono text-sm" />
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable) => (
                        <Badge key={variable} variant="secondary">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full bg-transparent">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Email
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="rounded-lg border p-4">
                          <p className="text-sm font-medium mb-2">Subject: {selectedTemplate.subject}</p>
                          <div className="mt-4 whitespace-pre-wrap text-sm">{selectedTemplate.body}</div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>View all sent emails and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.sentAt).toLocaleDateString()}</TableCell>
                        <TableCell>{log.recipient}</TableCell>
                        <TableCell>{log.templateName}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(log.status)}>{log.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Email Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Sent To</Label>
                                  <p className="text-sm">{log.recipient}</p>
                                </div>
                                <div>
                                  <Label>Subject</Label>
                                  <p className="text-sm">{log.subject}</p>
                                </div>
                                <div>
                                  <Label>Body</Label>
                                  <div className="mt-2 rounded-lg border p-4 whitespace-pre-wrap text-sm">
                                    {log.body}
                                  </div>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <p className="text-sm">
                                    <Badge variant={getStatusColor(log.status)}>{log.status}</Badge>
                                  </p>
                                </div>
                                <div>
                                  <Label>Sent At</Label>
                                  <p className="text-sm">{new Date(log.sentAt).toLocaleString()}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
