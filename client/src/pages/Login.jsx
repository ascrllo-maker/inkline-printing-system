import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Printer, Lock, Mail, User, Upload, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isBSIT, setIsBSIT] = useState(false);
  const [idImage, setIdImage] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const { login, setUserFromSignup } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success && result.user) {
      const role = result.user.role || 'student';
      
      if (role === 'it_admin') {
        navigate('/admin/it');
      } else if (role === 'ssc_admin') {
        navigate('/admin/ssc');
      } else {
        navigate('/student');
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (isBSIT && !idImage) {
      toast.error('Please upload a picture of your DVC school ID');
      return;
    }

    setSignupLoading(true);
    try {
      const formData = {
        fullName,
        email: signupEmail,
        password: signupPassword,
        isBSIT: isBSIT.toString(),
        idImage: idImage,
      };

      const response = await authAPI.signup(formData);
      console.log('Signup response:', response);
      const responseData = response.data;
      console.log('Signup response data:', responseData);
      
      if (isBSIT) {
        // BSIT students need approval - just show message and switch to login
        toast.success('Account created! Please wait for IT Admin approval.');
        setIsLogin(true);
        setFullName('');
        setSignupEmail('');
        setSignupPassword('');
        setIsBSIT(false);
        setIdImage(null);
      } else {
        // Non-BSIT students are approved immediately - log them in automatically
        if (responseData.token && responseData.user) {
          // Save token to localStorage
          localStorage.setItem('token', responseData.token);
          
          // Update user in context directly
          setUserFromSignup(responseData.user);
          
          toast.success('Account created successfully!');
          
          // Clear form
          setFullName('');
          setSignupEmail('');
          setSignupPassword('');
          setIsBSIT(false);
          setIdImage(null);
          
          // Navigate to student portal immediately
          navigate('/student');
        } else {
          // Fallback if no token (shouldn't happen for non-BSIT)
          toast.success('Account created successfully! You can now log in.');
          setIsLogin(true);
          setFullName('');
          setSignupEmail('');
          setSignupPassword('');
          setIsBSIT(false);
          setIdImage(null);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // If account was created but response handling failed, still show success
      if (error.response?.status === 201 || error.response?.status === 200) {
        toast.success('Account created successfully! Please log in.');
        setIsLogin(true);
      } else {
        toast.error(error.response?.data?.message || error.message || 'Signup failed');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full glass-card rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="glass-header p-6 text-center border-b border-white/20">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Printer className="w-10 h-10 text-white" />
            <h1 className="text-3xl font-bold text-white drop-shadow-md">InkLine</h1>
          </div>
          <p className="text-white/90 drop-shadow-sm">Smart Printing (DVC)</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-2 pt-2 pb-1 justify-center border-b border-white/20">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 px-5 text-center font-semibold text-sm transition-all rounded-t-lg ${
              isLogin
                ? 'text-white backdrop-blur-md bg-white/15 border border-white/20 shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 px-5 text-center font-semibold text-sm transition-all rounded-t-lg ${
              !isLogin
                ? 'text-white backdrop-blur-md bg-white/15 border border-white/20 shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 bg-white/5">
          {isLogin ? (
            <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-5 h-5 z-10" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-white/50 border border-white/20 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-5 h-5 z-10" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="glass-input w-full pl-10 pr-12 py-3 rounded-lg text-white placeholder-white/50 border border-white/20 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white transition-colors focus:outline-none z-10"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-button w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-5 h-5 z-10" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-white/50 border border-white/20 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-5 h-5 z-10" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-white/50 border border-white/20 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/80 w-5 h-5 z-10" />
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    className="glass-input w-full pl-10 pr-12 py-3 rounded-lg text-white placeholder-white/50 border border-white/20 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white transition-colors focus:outline-none z-10"
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3 drop-shadow-sm">
                  Are you a BSIT student?
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsBSIT(true)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      isBSIT
                        ? 'glass-button text-white shadow-lg'
                        : 'glass text-white/80 hover:bg-white/15 border border-white/20'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBSIT(false);
                      setIdImage(null);
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      !isBSIT
                        ? 'glass-button text-white shadow-lg'
                        : 'glass text-white/80 hover:bg-white/15 border border-white/20'
                    }`}
                  >
                    NO
                  </button>
                </div>
                {isBSIT && (
                  <p className="text-sm text-white/90 mt-2 drop-shadow-sm">
                    Your account will need approval from IT Admin before you can access IT Printing Shop.
                  </p>
                )}
                {!isBSIT && (
                  <p className="text-sm text-white/90 mt-2 drop-shadow-sm">
                    You will have access to SSC Printing Shop only.
                  </p>
                )}
              </div>

              {isBSIT && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">
                    Upload DVC School ID (Front Only)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdImage(e.target.files[0])}
                      required={isBSIT}
                      className="glass-input w-full rounded-lg p-3 text-white border border-white/20 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/50 file:text-white hover:file:bg-purple-500/70"
                    />
                    {idImage && (
                      <div className="mt-2 flex items-center space-x-2 text-sm text-green-300 drop-shadow-sm">
                        <Upload className="w-4 h-4" />
                        <span>{idImage.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={signupLoading}
                className="glass-button w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {signupLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
