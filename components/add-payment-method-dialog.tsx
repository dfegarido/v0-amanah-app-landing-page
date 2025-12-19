'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { authenticatedPost } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface PaymentFormProps {
  clientSecret: string
  onSuccess: () => void
  onCancel: () => void
}

function PaymentForm({ clientSecret, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast({
          title: 'Payment method failed',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Payment method added',
          description: 'Your payment method has been successfully added.',
        })
        onSuccess()
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Adding...' : 'Add Card'}
        </Button>
      </div>
    </form>
  )
}

interface AddPaymentMethodDialogProps {
  onPaymentMethodAdded: () => void
  children?: React.ReactNode
}

export function AddPaymentMethodDialog({
  onPaymentMethodAdded,
  children,
}: AddPaymentMethodDialogProps) {
  const [open, setOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen)

    if (newOpen && !clientSecret) {
      // Create setup intent when dialog opens
      setIsLoading(true)
      try {
        const response = await authenticatedPost<{ data: { clientSecret: string } }>(
          '/api/stripe/setup-intent'
        )
        setClientSecret(response.data.clientSecret)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to initialize payment form',
          variant: 'destructive',
        })
        setOpen(false)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSuccess = () => {
    setOpen(false)
    setClientSecret(null)
    onPaymentMethodAdded()
  }

  const handleCancel = () => {
    setOpen(false)
    setClientSecret(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || <Button>Add Payment Method</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a credit or debit card to your account. Your payment information is
            securely processed by Stripe.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </Elements>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

