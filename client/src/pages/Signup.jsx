import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Button from '../components/Button'
import ButtonGradient from '../assets/svg/ButtonGradient'

const Signup = () => {
  return (
    <>
      <div className="pt-[4.75rem] lg:pt-[6.25rem] overflow-hidden">
        <Header/>
        <div className="min-h-screen bg-gradient-to-br from-n-8 via-n-7 to-n-6 flex items-center justify-center p-4">
          <motion.div 
            className='backdrop-blur-sm bg-n-8/40 border border-n-2/20 p-8 rounded-2xl shadow-xl items-center space-y-8 max-w-md w-full hover:border-color-1/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(172,108,255,0.3)]'
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
          >
            <motion.h1 
                className='text-center text-n-1 text-2xl font-bold'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                Create Account
            </motion.h1>
            
            <motion.form 
                className='w-full flex flex-col space-y-6 font-medium'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                <input 
                    className="w-full px-4 py-3 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105" 
                    type="text" 
                    placeholder='Username' 
                    required
                />
                <input 
                    className="w-full px-4 py-3 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105" 
                    type="email" 
                    placeholder='Email' 
                    required
                />
                <input 
                    className="w-full px-4 py-3 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105" 
                    type="password" 
                    placeholder='Password' 
                    required
                />
                <input 
                    className="w-full px-4 py-3 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105" 
                    type="password" 
                    placeholder='Confirm Password' 
                    required
                />
                
                <div className="flex gap-4">
                    <Button
                        className="flex-1"
                        type="submit"
                    >
                        Create Account
                    </Button>
                </div>
                
                <p className="text-center text-n-3">
                    Already have an account?{' '}
                    <Link to="/login" className="text-color-1 hover:underline">
                        Sign in
                    </Link>
                </p>
            </motion.form>
          </motion.div>
        </div>
      </div>
      <ButtonGradient />
    </>
  )
}

export default Signup
