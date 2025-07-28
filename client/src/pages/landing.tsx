import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Zap, Cpu, Rocket, Users, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">CodeCraft AI</span>
          </div>
          <Button onClick={() => window.location.href = '/login'} variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-500/10">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300 mb-6">
              <Zap className="w-4 h-4 mr-2" />
              AI-Powered Development Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Build Apps with AI
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              The ultimate development platform combining the power of Replit, Lovable, and Bolt.new. 
              Generate, edit, and deploy applications with AI assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = '/login'}
                size="lg" 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 text-lg"
              >
                Get Started Free
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-3 text-lg"
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Build</h2>
            <p className="text-xl text-slate-300">Powerful features designed for modern development</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">AI Code Generation</h3>
                <p className="text-slate-300">Generate complete applications, components, and functions using advanced AI models. Just describe what you want to build.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Monaco Editor</h3>
                <p className="text-slate-300">Professional code editor with syntax highlighting, IntelliSense, and all the features you expect from modern IDEs.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Instant Preview</h3>
                <p className="text-slate-300">See your changes in real-time with instant preview. No waiting for builds or deployments during development.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-300">Start free, scale as you grow</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-white">Free</h3>
                <div className="text-3xl font-bold text-purple-400 mb-4">$0<span className="text-lg text-slate-400">/month</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    1,000 credits included
                  </li>
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    3 projects limit
                  </li>
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Community support
                  </li>
                </ul>
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  variant="outline" 
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/50 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Popular
              </div>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-white">Pro</h3>
                <div className="text-3xl font-bold text-white mb-4">$19<span className="text-lg text-slate-400">/month</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    5,000 credits included
                  </li>
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Unlimited projects
                  </li>
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Priority AI access
                  </li>
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Advanced templates
                  </li>
                  <li className="flex items-center text-slate-300">
                    <Star className="w-4 h-4 text-green-500 mr-2" />
                    Priority support
                  </li>
                </ul>
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  Start Pro Trial
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-slate-400">Need more credits? Buy additional credits starting at $10 for 1,000 credits</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build the Future?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of developers who are already building amazing applications with AI assistance.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg" 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 text-lg"
          >
            Start Building Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
              <Code className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">CodeCraft AI</span>
          </div>
          <p className="text-slate-400">© 2024 CodeCraft AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
