import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
import { ListingPage } from "./pages/ListingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateListingPage } from "./pages/CreateListingPage";
import { SearchPage } from "./pages/SearchPage";
import { PaymentPage } from "./pages/PaymentPage";
import { PaymentSetupPage } from "./pages/PaymentSetupPage";
import { ContactPage } from "./pages/ContactPage";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileSetup } from "./components/ProfileSetup";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <Toaster />
        <Routes>
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </div>
    </Router>
  );
}

function MainApp() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.profiles.getCurrentProfile);

  if (loggedInUser === undefined || (loggedInUser && profile === undefined)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <Authenticated>
          {loggedInUser && !profile ? (
            <ProfileSetup />
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/listing/:id" element={<ListingPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/create-listing" element={<CreateListingPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/payment/:listingId" element={<PaymentPage />} />
              <Route path="/payment-setup" element={<PaymentSetupPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Authenticated>
        <Unauthenticated>
          <div className="flex items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3">
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs">🛒</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                  Welcome to CampusMart
                </h1>
                <p className="text-gray-600">Your university marketplace for buying and selling</p>
              </div>
              <SignInForm />
            </div>
          </div>
        </Unauthenticated>
      </main>
      <Footer />
    </>
  );
}
