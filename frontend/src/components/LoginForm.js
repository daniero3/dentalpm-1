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

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <motion.div 
            className="flex justify-center mb-6"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="relative">
              <div className="bg-card p-4 rounded-2xl shadow-lg border border-border">
                <Stethoscope className="h-10 w-10 text-primary" />
              </div>
              {/* Pulse animation */}
              <motion.div
                className="absolute inset-0 bg-primary/20 rounded-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
          <motion.h1 
            className="text-4xl font-bold text-foreground mb-2"
            variants={itemVariants}
          >
            Dental Practice
          </motion.h1>
          <motion.p 
            className="text-muted-foreground text-lg"
            variants={itemVariants}
          >
            Système de gestion - Madagascar
          </motion.p>
        </motion.div>

        {/* Login Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-foreground">
                Bienvenue
              </CardTitle>
              <CardDescription className="text-base">
                Connectez-vous ou créez un compte pour accéder au système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="text-sm font-medium">
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-sm font-medium">
                    Inscription
                  </TabsTrigger>
                </TabsList>
                
                {/* Login Tab */}
                <TabsContent value="login" className="space-y-6">
                  <motion.form 
                    onSubmit={handleLogin} 
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div 
                      className="space-y-2"
                      whileFocus={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Label htmlFor="username" className="text-sm font-medium">
                        Nom d'utilisateur
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="admin"
                          className="pl-10 h-11 bg-background/50 border-border focus:border-primary transition-colors"
                          value={loginData.username}
                          onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                          required
                        />
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="space-y-2"
                      whileFocus={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Label htmlFor="password" className="text-sm font-medium">
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="admin123"
                          className="pl-10 pr-10 h-11 bg-background/50 border-border focus:border-primary transition-colors"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base font-medium medical-gradient shadow-lg hover:shadow-xl transition-all duration-200" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <motion.div 
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Connexion en cours...
                          </div>
                        ) : (
                          'Se connecter'
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </TabsContent>
                
                {/* Register Tab */}
                <TabsContent value="register" className="space-y-6">
                  <motion.form 
                    onSubmit={handleRegister} 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="reg-full-name" className="text-sm font-medium">
                        Nom complet
                      </Label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-full-name"
                          type="text"
                          placeholder="Dr. Jean Dupont"
                          className="pl-10 h-11 bg-background/50 border-border focus:border-primary transition-colors"
                          value={registerData.full_name}
                          onChange={(e) => setRegisterData({...registerData, full_name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-sm font-medium">
                        Nom d'utilisateur
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-username"
                          type="text"
                          placeholder="jdupont"
                          className="pl-10 h-11 bg-background/50 border-border focus:border-primary transition-colors"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="jean.dupont@cabinet.mg"
                          className="pl-10 h-11 bg-background/50 border-border focus:border-primary transition-colors"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reg-role" className="text-sm font-medium">
                        Rôle
                      </Label>
                      <Select value={registerData.role} onValueChange={(value) => setRegisterData({...registerData, role: value})}>
                        <SelectTrigger className="h-11 bg-background/50 border-border">
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
                      <Label htmlFor="reg-password" className="text-sm font-medium">
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="Mot de passe sécurisé"
                          className="pl-10 h-11 bg-background/50 border-border focus:border-primary transition-colors"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base font-medium medical-gradient shadow-lg hover:shadow-xl transition-all duration-200" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <motion.div 
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Inscription en cours...
                          </div>
                        ) : (
                          'S\'inscrire'
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Footer */}
        <motion.div 
          className="text-center mt-8 space-y-2"
          variants={itemVariants}
        >
          <p className="text-sm text-muted-foreground">
            Système de gestion dentaire pour Madagascar
          </p>
          <p className="text-xs text-muted-foreground/70">
            Version 1.0 - Conforme aux réglementations locales
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginForm;