import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Code, Star } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed to CodeCraft AI Pro!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        size="lg"
      >
        {isProcessing ? "Processing..." : "Subscribe Now"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (isAuthenticated && !clientSecret) {
      setLoadingSubscription(true);
      // Create subscription as soon as the page loads
      apiRequest("POST", "/api/create-subscription")
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          if (isUnauthorizedError(error)) {
            toast({
              title: "Unauthorized",
              description: "You are logged out. Logging in again...",
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.href = "/api/login";
            }, 500);
            return;
          }
          toast({
            title: "Error",
            description: "Failed to create subscription. Please try again.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoadingSubscription(false);
        });
    }
  }, [isAuthenticated, clientSecret, toast]);

  if (isLoading || loadingSubscription) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">CodeCraft AI</span>
          </div>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Back
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300 mb-6">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Unlock the Full Power of AI
          </h1>
          <p className="text-xl text-slate-400">
            Get unlimited access to advanced features and priority support
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Current Plan */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-50">Free Plan</CardTitle>
                <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                  Current
                </Badge>
              </div>
              <CardDescription className="text-slate-400">
                Limited features for getting started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold text-slate-50">$0/month</div>
              <ul className="space-y-3">
                <li className="flex items-center text-slate-300">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  1,000 credits included
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  3 projects limit
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  Basic templates
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  Community support
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Recommended
            </div>
            <CardHeader>
              <CardTitle className="text-white">Pro Plan</CardTitle>
              <CardDescription className="text-slate-300">
                Everything you need for professional development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-3xl font-bold text-white">$19<span className="text-lg text-slate-400">/month</span></div>
              <ul className="space-y-3">
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  5,000 credits included monthly
                </li>
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  Unlimited projects
                </li>
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  Priority AI access
                </li>
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  Advanced templates
                </li>
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  Real-time collaboration
                </li>
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  Priority support
                </li>
                <li className="flex items-center text-slate-200">
                  <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                  Custom deployment options
                </li>
              </ul>

              {stripePromise && clientSecret ? (
                <div className="mt-8">
                  {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <SubscribeForm />
                  </Elements>
                </div>
              ) : (
                <div className="mt-8">
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg"
                    disabled={!stripePromise}
                    onClick={() => {
                      if (!stripePromise) {
                        toast({
                          title: "Payment Not Available",
                          description: "Payment services are currently not configured. Please contact support.",
                          variant: "destructive",
                        });
                      } else {
                        // createSubscription();
                        // This would be implemented when Stripe is properly configured
                      }
                    }}
                  >
                    {!stripePromise ? "Payment Not Available" : "Upgrade to Pro"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Why Choose Pro?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-50">5x More Credits</h3>
                <p className="text-sm text-slate-400">
                  Generate more code, chat with AI longer, and build bigger projects
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-50">Priority Access</h3>
                <p className="text-sm text-slate-400">
                  Skip the queue and get faster AI responses even during peak times
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-50">Advanced Features</h3>
                <p className="text-sm text-slate-400">
                  Access to premium templates, collaboration tools, and deployment options
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">
            Need more credits? Buy additional credits starting at $10 for 1,000 credits
          </p>
          <p className="text-sm text-slate-500">
            Cancel anytime. No long-term commitments.
          </p>
        </div>
      </div>
    </div>
  );
}
