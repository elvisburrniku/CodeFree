import { Button } from "@/components/ui/button";
import { Code, Coins, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";

interface TopNavigationProps {
  user: any;
  onOpenAIChat: () => void;
}

export default function TopNavigation({ user, onOpenAIChat }: TopNavigationProps) {
  const [, setLocation] = useLocation();

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">CodeCraft AI</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-1 ml-8">
          <Button 
            onClick={() => setLocation('/')}
            variant="ghost"
            className="px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors text-sm"
          >
            Dashboard
          </Button>
          <Button 
            onClick={onOpenAIChat}
            className="px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            <span className="mr-2">✨</span>
            Generate Code
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Credit Display */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-700 px-3 py-2 rounded-lg">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">{user?.credits || 0}</span>
          <span className="text-slate-400 text-sm">credits</span>
        </div>
        
        {/* User Menu */}
        <div className="relative">
          <div className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 transition-colors">
            {user?.profileImageUrl && (
              <img 
                src={user.profileImageUrl} 
                alt="User avatar" 
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <span className="hidden md:block text-sm font-medium">
              {user?.firstName || user?.email || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </nav>
  );
}
