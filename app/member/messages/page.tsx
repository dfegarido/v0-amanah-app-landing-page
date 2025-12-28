"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Plus,
  Loader2,
  User,
  Clock,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet, authenticatedPost, authenticatedPatch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string | null
  body: string
  parent_message_id: string | null
  read_at: string | null
  created_at: string
  sender?: {
    id: string
    name: string
    email: string
  }
  recipient?: {
    id: string
    name: string
    email: string
  }
}

interface Conversation {
  userId: string
  userName: string
  userEmail: string
  lastMessage: Message
  unreadCount: number
  messages: Message[]
}

export default function MessagesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showComposeDialog, setShowComposeDialog] = useState(false)
  
  // Compose message state
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientId, setRecipientId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  
  // Search
  const [searchQuery, setSearchQuery] = useState("")

  // Ref for messages container to enable auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Fetch all messages
  useEffect(() => {
    if (user) {
      fetchMessages()
    }
  }, [user])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return

    console.log('Setting up real-time subscription for messages...')

    // Subscribe to new messages where current user is the recipient
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('New message received via realtime:', payload.new)
          
          // Fetch the full message with user data via API
          try {
            const response: any = await authenticatedGet(`/api/messages/${payload.new.id}`)
            if (response.success && response.data) {
              const newMessage = response.data
              
              // Add to messages state
              setMessages(prev => {
                // Check if message already exists (avoid duplicates)
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev
                }
                return [newMessage, ...prev]
              })

              // Show notification if message is not from currently selected conversation
              if (selectedConversation?.userId !== newMessage.sender_id) {
                toast({
                  title: "New Message",
                  description: `New message from ${newMessage.sender?.name || newMessage.sender?.email || 'Someone'}`,
                })
              }

              // Auto-mark as read if viewing the conversation
              // Use a small delay to ensure state is updated
              setTimeout(() => {
                if (selectedConversation?.userId === newMessage.sender_id) {
                  markAsRead(newMessage.id)
                  // Scroll to bottom to show new message
                  if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
                  }
                }
              }, 100)
            }
          } catch (error) {
            console.error('Error fetching new message details:', error)
            // Still add the message with basic data
            setMessages(prev => {
              if (prev.some(msg => msg.id === payload.new.id)) {
                return prev
              }
              return [payload.new as Message, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Message updated via realtime:', payload.new)
          // Update message in state (e.g., marked as read)
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          )
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Only depend on user.id, not selectedConversation to avoid re-subscribing

  const fetchMessages = async () => {
    if (!user) return
    
    try {
      const params = new URLSearchParams({
        folder: "all",
        page: "1",
        limit: "100",
      })

      const response: any = await authenticatedGet(`/api/messages?${params.toString()}`)
      
      if (response.success && response.data) {
        setMessages(response.data.messages || [])
      } else {
        throw new Error(response.error || "Failed to fetch messages")
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load messages",
        variant: "destructive",
      })
    }
  }

  // Group messages into conversations
  const conversations = useMemo(() => {
    if (!user || !messages.length) return []

    const conversationMap = new Map<string, Conversation>()

    messages.forEach((message) => {
      // Determine the other user in this conversation
      const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id
      const otherUser = message.sender_id === user.id ? message.recipient : message.sender

      if (!otherUser) return

      const key = otherUserId

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          userId: otherUserId,
          userName: otherUser.name || otherUser.email || "Unknown",
          userEmail: otherUser.email || "",
          lastMessage: message,
          unreadCount: 0,
          messages: [],
        })
      }

      const conversation = conversationMap.get(key)!
      conversation.messages.push(message)

      // Update last message if this one is newer
      if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
        conversation.lastMessage = message
      }

      // Count unread messages (only received messages that are unread)
      if (message.recipient_id === user.id && !message.read_at) {
        conversation.unreadCount++
      }
    })

    // Sort conversations by last message time (newest first)
    return Array.from(conversationMap.values()).sort((a, b) => {
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    })
  }, [messages, user])

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations
    const query = searchQuery.toLowerCase()
    return conversations.filter(conv =>
      conv.userName.toLowerCase().includes(query) ||
      conv.userEmail.toLowerCase().includes(query) ||
      conv.lastMessage.body.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  // Get messages for selected conversation
  const conversationMessages = useMemo(() => {
    if (!selectedConversation || !user) return []
    
    // Get all messages with this user, sorted by time
    const convMessages = messages
      .filter(msg => 
        (msg.sender_id === user.id && msg.recipient_id === selectedConversation.userId) ||
        (msg.recipient_id === user.id && msg.sender_id === selectedConversation.userId)
      )
      .sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    
    return convMessages
  }, [selectedConversation, messages, user])

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    if (messagesEndRef.current && selectedConversation) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [conversationMessages.length, selectedConversation?.userId])

  const markAsRead = async (messageId: string) => {
    // Optimistically update state
    const readTimestamp = new Date().toISOString()
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, read_at: readTimestamp } : msg
      )
    )
    
    // Sync with server
    try {
      await authenticatedPatch(`/api/messages/${messageId}/read`, {})
    } catch (error) {
      console.error("Error marking message as read:", error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, read_at: null } : msg
        )
      )
    }
  }

  // Mark all messages in conversation as read when viewing
  useEffect(() => {
    if (selectedConversation && user) {
      selectedConversation.messages.forEach(msg => {
        if (msg.recipient_id === user.id && !msg.read_at) {
          markAsRead(msg.id)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.userId])

  const handleSendMessage = async (conversationId?: string) => {
    const finalRecipientId = conversationId || recipientId
    
    if (!finalRecipientId || !body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter message body",
        variant: "destructive",
      })
      return
    }

    const messageBody = body.trim()
    const messageSubject = subject.trim() || null

    // Create optimistic message with sender data
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user!.id,
      recipient_id: finalRecipientId,
      subject: messageSubject,
      body: messageBody,
      parent_message_id: null,
      read_at: null,
      created_at: new Date().toISOString(),
      sender: {
        id: user!.id,
        name: user!.name || "",
        email: user!.email || "",
      },
    }

    // Optimistically add to messages
    setMessages(prev => [optimisticMessage, ...prev])

    // Reset form
    setBody("")
    setSubject("")
    setShowComposeDialog(false)

    // If sending to a new person (not in current conversation), find or create conversation
    if (!conversationId) {
      // Find if conversation exists, or it will be created in the conversations memo
      const existingConv = conversations.find(c => c.userId === finalRecipientId)
      if (existingConv) {
        setSelectedConversation(null) // Clear to trigger re-render
        setTimeout(() => setSelectedConversation(existingConv), 0)
      }
    }

    // Send message
    try {
      const response: any = await authenticatedPost("/api/messages", {
        recipient_id: finalRecipientId,
        subject: messageSubject,
        body: messageBody,
      })

      if (response.success && response.data) {
        // Replace optimistic message with real one (which has full user data)
        setMessages(prev =>
          prev.map(msg =>
            msg.id === optimisticMessage.id ? response.data : msg
          )
        )
        
        // Refresh messages to get updated user data for recipient
        // This ensures recipient info is populated
        setTimeout(() => {
          fetchMessages()
        }, 100)
        
        toast({
          title: "Success",
          description: "Message sent successfully",
        })
      } else {
        throw new Error(response.error || "Failed to send message")
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
      setBody(messageBody) // Restore message on error
    }
  }

  const handleSearchRecipient = async () => {
    if (!recipientEmail.trim()) {
      setRecipientId("")
      return
    }

    try {
      const response: any = await authenticatedGet(`/api/user/search?email=${encodeURIComponent(recipientEmail)}`)
      
      if (response.success && response.data) {
        setRecipientId(response.data.id)
        toast({
          title: "User Found",
          description: `Sending to: ${response.data.name || response.data.email}`,
        })
      } else {
        setRecipientId("")
        toast({
          title: "User Not Found",
          description: "Please enter a valid user email",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error searching recipient:", error)
      setRecipientId("")
      toast({
        title: "Error",
        description: error.message || "Failed to find user",
        variant: "destructive",
      })
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/member")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>
          <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>Send a message to another user</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Email *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="recipient"
                      type="email"
                      placeholder="user@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      onBlur={handleSearchRecipient}
                    />
                    <Button type="button" onClick={handleSearchRecipient} variant="outline">
                      Search
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject (Optional)</Label>
                  <Input
                    id="subject"
                    placeholder="Message subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message *</Label>
                  <Textarea
                    id="body"
                    placeholder="Type your message here..."
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowComposeDialog(false)
                      setRecipientEmail("")
                      setRecipientId("")
                      setSubject("")
                      setBody("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleSendMessage()} disabled={!recipientId || !body.trim()}>
                    Send Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-5rem)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full">
              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No conversations found" : "No messages yet"}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isSelected = selectedConversation?.userId === conversation.userId
                    const isUnread = conversation.unreadCount > 0
                    
                    return (
                      <button
                        key={conversation.userId}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full text-left p-4 hover:bg-secondary/50 transition-colors border-b ${
                          isSelected ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-medium truncate ${isUnread ? "font-semibold" : ""}`}>
                                {conversation.userName}
                              </p>
                              {isUnread && (
                                <Badge variant="default" className="ml-2">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.lastMessage.body}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conversation.lastMessage.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat View */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedConversation.userName}</p>
                      <p className="text-sm text-muted-foreground">{selectedConversation.userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationMessages.map((message) => {
                    const isSent = message.sender_id === user.id
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isSent
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                          <p className={`text-xs mt-1 ${
                            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {/* Scroll anchor - invisible element at bottom for auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendMessage(selectedConversation.userId)
                    }}
                    className="flex gap-2"
                  >
                    <Textarea
                      placeholder="Type a message..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={1}
                      className="resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(selectedConversation.userId)
                        }
                      }}
                    />
                    <Button type="submit" disabled={!body.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Select a conversation to view messages</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
