import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Stethoscope, User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
  const { user, login, register } = useAuth();
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(loginData.username, loginData.password);
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(registerData);
    if (result.success) {
      setRegisterData({ username: '', email: '', password: '', role: '', full_name: '' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0F7E8A] mb-4 shadow-lg">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              DentalPM
            </h1>
            <p className="text-gray-500 mt-1">
              Gestion de cabinet dentaire
            </p>
          </div>

          {/* Login Card */}
          <Card className="shadow-xl border border-gray-100 bg-white rounded-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Connexion
              </CardTitle>
              <CardDescription>
                Accédez à votre espace de gestion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                  >
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                  >
                    Inscription
                  </TabsTrigger>
                </TabsList>
                
                {/* Login Tab */}
                <TabsContent value="login" className="space-y-5">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                        Nom d'utilisateur
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="admin"
                          className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:border-[#0F7E8A] focus:ring-[#0F7E8A]"
                          value={loginData.username}
                          onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-11 bg-white border-gray-200 rounded-lg focus:border-[#0F7E8A] focus:ring-[#0F7E8A]"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-[#0F7E8A] hover:bg-[#0a6872] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all" 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Connexion...
                        </div>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                {/* Register Tab */}
                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Nom complet</Label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Dr. Jean Rakoto"
                          className="pl-10 h-11 bg-white border-gray-200 rounded-lg"
                          value={registerData.full_name}
                          onChange={(e) => setRegisterData({...registerData, full_name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Identifiant</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="jrakoto"
                          className="pl-10 h-11 bg-white border-gray-200 rounded-lg"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="jean@cabinet.mg"
                          className="pl-10 h-11 bg-white border-gray-200 rounded-lg"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Rôle</Label>
                      <Select value={registerData.role} onValueChange={(value) => setRegisterData({...registerData, role: value})}>
                        <SelectTrigger className="h-11 bg-white border-gray-200 rounded-lg">
                          <SelectValue placeholder="Sélectionnez votre rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DENTIST">Dentiste</SelectItem>
                          <SelectItem value="ASSISTANT">Assistant(e)</SelectItem>
                          <SelectItem value="ACCOUNTANT">Comptable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 h-11 bg-white border-gray-200 rounded-lg"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-[#0F7E8A] hover:bg-[#0a6872] text-white font-medium rounded-lg shadow-md" 
                      disabled={loading}
                    >
                      {loading ? 'Inscription...' : 'S\'inscrire'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Daniero Global LLC — DentalPM Madagascar
      </footer>
    </div>
  );
};

export default LoginForm;
