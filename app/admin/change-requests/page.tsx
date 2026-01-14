'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, X, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { authenticatedGet, authenticatedPost } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

interface ChangeRequest {
  id: string
  subscription_id: string
  subscription_type: string
  user_id: string
  changes: Record<string, any>
  previous_data: Record<string, any>
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
}

export default function AdminChangeRequestsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchChangeRequests()
    }
  }, [user, statusFilter])

  const fetchChangeRequests = async () => {
    try {
      setLoading(true)
      const statusParam = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      const response: any = await authenticatedGet(`/api/admin/change-requests${statusParam}`)
      
      if (response.success && response.data) {
        setChangeRequests(response.data.changeRequests || [])
      }
    } catch (error: any) {
      console.error('Error fetching change requests:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load change requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (request: ChangeRequest) => {
    setSelectedRequest(request)
    setShowApproveDialog(true)
  }

  const handleRejectClick = (request: ChangeRequest) => {
    setSelectedRequest(request)
    setRejectReason('')
    setShowRejectDialog(true)
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    // Optimistic update - update UI immediately
    const updatedRequest = {
      ...selectedRequest,
      status: 'approved' as const,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }

    // Update local state immediately
    setChangeRequests(prev => 
      prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
    )

    setShowApproveDialog(false)
    setProcessing(false)

    // Show success toast immediately
    toast({
      title: 'Change Request Approved',
      description: 'The changes have been applied to the subscription.',
    })

    // Fire API call in background (non-blocking)
    try {
      const response: any = await authenticatedPost(
        `/api/admin/change-requests/${selectedRequest.id}/approve`,
        {}
      )

      if (!response.success) {
        throw new Error(response.message || 'Failed to approve change request')
      }
    } catch (error: any) {
      console.error('Background approval failed:', error)
      // Revert optimistic update on error
      setChangeRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? selectedRequest : req)
      )
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve change request. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      })
      return
    }

    // Optimistic update - update UI immediately
    const updatedRequest = {
      ...selectedRequest,
      status: 'rejected' as const,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      review_notes: rejectReason,
    }

    // Update local state immediately
    setChangeRequests(prev => 
      prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
    )

    setShowRejectDialog(false)
    setProcessing(false)
    setRejectReason('')

    // Show success toast immediately
    toast({
      title: 'Change Request Rejected',
      description: 'The user has been notified.',
    })

    // Fire API call in background (non-blocking)
    try {
      const response: any = await authenticatedPost(
        `/api/admin/change-requests/${selectedRequest.id}/reject`,
        { review_notes: rejectReason }
      )

      if (!response.success) {
        throw new Error(response.message || 'Failed to reject change request')
      }
    } catch (error: any) {
      console.error('Background rejection failed:', error)
      // Revert optimistic update on error
      setChangeRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? selectedRequest : req)
      )
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject change request. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatFieldName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const pendingCount = changeRequests.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Change Requests</h1>
              <p className="text-muted-foreground">
                Review and approve/reject subscription change requests
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge variant="default" className="bg-yellow-500">
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('approved')}
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('rejected')}
          >
            Rejected
          </Button>
        </div>

        {/* Change Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Change Requests</CardTitle>
            <CardDescription>
              Click on any row to view details and approve/reject changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {changeRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No change requests found</p>
                <p className="text-sm text-muted-foreground">
                  {statusFilter === 'pending' ? 'There are no pending change requests at the moment.' : `No ${statusFilter} change requests found.`}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeRequests.map((request) => (
                    <React.Fragment key={request.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-8 w-8"
                            onClick={() => toggleRow(request.id)}
                          >
                            {expandedRows[request.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(request.created_at).toLocaleDateString()}
                          <div className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{request.subscription_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{Object.keys(request.changes).length} field(s)</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              request.status === 'approved' 
                                ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                                : request.status === 'pending'
                                ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600'
                                : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleApproveClick(request)
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRejectClick(request)
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRows[request.id] && (
                        <TableRow key={`${request.id}-details`}>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="py-4 space-y-4">
                              <div>
                                <h4 className="font-semibold mb-3">Requested Changes:</h4>
                                <div className="bg-background rounded-lg p-4 space-y-3">
                                  {Object.entries(request.changes).map(([key, value]) => (
                                    <div key={key} className="grid grid-cols-3 gap-4 text-sm">
                                      <span className="font-medium text-muted-foreground">
                                        {formatFieldName(key)}:
                                      </span>
                                      <span className="col-span-2 text-foreground break-words">
                                        {formatFieldValue(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {request.review_notes && (
                                <div className="p-3 bg-background rounded-lg border">
                                  <p className="text-sm font-semibold mb-1">Review Notes:</p>
                                  <p className="text-sm text-muted-foreground">{request.review_notes}</p>
                                </div>
                              )}

                              {request.reviewed_at && (
                                <div className="text-xs text-muted-foreground">
                                  Reviewed on {new Date(request.reviewed_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Change Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply the requested changes to the subscription immediately. The user will be notified of the approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this change request. The user will be notified with your explanation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this change request is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

