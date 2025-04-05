import React from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";
import { usePartner } from "@/hooks/use-partner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type MainLayoutProps = {
  children: React.ReactNode;
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const { partner, isLoading: isPartnerLoading } = usePartner();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Questions", path: "/question" },
    { name: "Journal", path: "/journal" },
    { name: "Conversations", path: "/conversation-starters" },
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans text-charcoal bg-cream">
      <style dangerouslySetInnerHTML={{
        __html: `
        body {
          background-image: radial-gradient(#DAE3E1 0.5px, transparent 0.5px), radial-gradient(#DAE3E1 0.5px, #F5F5F0 0.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
        }
        .hand-drawn {
          position: relative;
        }
        .hand-drawn::after {
          content: "";
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 100%;
          height: 1px;
          background-image: url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='0' x2='100%25' y2='0' stroke='%237C9A92' stroke-width='2' stroke-dasharray='1, 10' stroke-dashoffset='0' stroke-linecap='round'/%3E%3C/svg%3E");
          opacity: 0.7;
        }
        .hand-drawn-border {
          position: relative;
          border: none;
        }
        .hand-drawn-border::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 1px solid;
          border-color: #7C9A92;
          border-radius: 0.5rem;
          opacity: 0.7;
          pointer-events: none;
          transform: translate(2px, 2px);
        }
        .leaf-bullet li::before {
          content: "🌿";
          margin-right: 0.5rem;
          font-size: 0.8rem;
        }
        `
      }} />

      <header className="bg-white border-b border-sage-light py-4 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/">
              <Logo size="medium" />
            </Link>
            
            {user?.partnerId && (
              <div className="ml-4 flex items-center">
                <div className="flex items-center px-3 py-1 bg-sage-light/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-xs text-sage-dark mr-2">Connected with</span>
                  {!isPartnerLoading && partner ? (
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-sage-dark mr-2">{partner.name}</span>
                      <Avatar className="h-6 w-6 border border-sage">
                        <AvatarFallback className="text-[10px] bg-sage-light text-sage-dark">
                          {partner.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <span className="text-xs text-sage-dark">Partner</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <nav>
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path} className={`px-3 py-2 rounded hover:bg-sage-light transition duration-200 ${
                  location === item.path ? 'text-sage font-medium' : ''
                }`}>
                  {item.name}
                </Link>
              ))}
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative ml-2 h-8 w-8 rounded-full focus:outline-none">
                      <Avatar className="h-8 w-8 border border-sage">
                        <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem>
                        <UserIcon className="w-4 h-4 mr-2" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    {!user.partnerId && (
                      <Link href="/invite">
                        <DropdownMenuItem>
                          <span>Invite Partner</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden focus:outline-none">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-8">
                  {user?.partnerId && partner && (
                    <div className="flex items-center px-3 py-2 bg-sage-light/30 rounded-md mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-xs text-sage-dark mr-2">Connected with</span>
                      <span className="text-xs font-medium text-sage-dark">{partner.name}</span>
                    </div>
                  )}
                
                  {navItems.map((item) => (
                    <Link key={item.path} href={item.path} className={`px-3 py-2 rounded hover:bg-sage-light transition duration-200 ${
                      location === item.path ? 'text-sage font-medium' : ''
                    }`}>
                      {item.name}
                    </Link>
                  ))}
                  
                  <Link href="/profile" className="px-3 py-2 rounded hover:bg-sage-light transition duration-200">
                    Profile
                  </Link>
                  
                  {!user?.partnerId && (
                    <Link href="/invite" className="px-3 py-2 rounded hover:bg-sage-light transition duration-200">
                      Invite Partner
                    </Link>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="justify-start px-3"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Log out</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t border-sage-light py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <Logo size="small" />
              </div>
              <p className="text-xs text-gray-500 mt-1">A virtual gardener for your relationship</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-gray-600 hover:text-sage">About</a>
              <a href="#" className="text-sm text-gray-600 hover:text-sage">Privacy</a>
              <a href="#" className="text-sm text-gray-600 hover:text-sage">Terms</a>
              <a href="#" className="text-sm text-gray-600 hover:text-sage">Help</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} Loveslices. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
