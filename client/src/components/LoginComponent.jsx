import React, {useState, useEffect} from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Button from './Button'

const LoginComponent = () => {
        
        // hooks for username, password, and errors during form submission
        const [username, setUsername] = useState("");
        const [password, setPassword] = useState("");
        const [message, setMessage] = useState("");
        const [loggedin, setLoggedin] = useState(false);
        const [button, setButton] = useState("");

        // update login button based on login state
        useEffect(() => {
            fetch('http://localhost:3000/api/status', { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                setLoggedin(data.loggedin);
                });
        }, []);

        useEffect(() => {
            setButton(loggedin ? "Logout" : "Login");
        }, [loggedin]);


        // submission function
        const submit = async (e) => {
            
            // prevent reload
            e.preventDefault();

            // handle various actions of submit form
            const action = e.nativeEvent.submitter.value;

            // handle action values

            if (action === "Login") {
                // login
                try {
                    // send a POST request to server
                    const res = await fetch('http://localhost:3000/api/login', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username, password}),
                        credentials: 'include'
                    });

                    // set data to response from backend
                    const data = await res.json();

                    if(!res.ok) {
                        setMessage(`${data.message}`);
                    } else {
                        setMessage(`${data.message}`);
                        setLoggedin(true);
                    } 
                } catch(err) {
                    setMessage(`Error logging in`);
                }
                
            } else if (action === "Logout") {
                // logout
                try {
                    // send a POST request to server
                    const res = await fetch('http://localhost:3000/api/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });

                    // set data to response from backend
                    const data = await res.json();

                    if(!res.ok) {
                        setMessage(`${data.message}`);
                    } else {
                        setUsername("");
                        setPassword("");
                        setMessage(`${data.message}`);
                        setLoggedin(false);
                    } 
                } catch(err) {
                    setMessage(`Error logging out.`);
                }
            } else {
                // register
                try {
                    // send a POST request to server
                    const res = await fetch('http://localhost:3000/api/register', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username, password}),
                        credentials: 'include'
                    });

                    // set data to response from backend
                    const data = await res.json();

                    if(!res.ok) {
                        setMessage(`${data.message}`);
                    } else {
                        setMessage(`${data.message}`);
                        setLoggedin(true);
                    } 
                } catch(err) {
                    setMessage(`Error registering account.`);
                }
            }
        }
  
        

    return (
        <div className='flex flex-col justify-center items-center min-h-screen font-medium'>
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
                    Cyclone Login
                </motion.h1>
                
                <motion.form 
                    className='w-full flex flex-col space-y-6 font-medium'
                    onSubmit={submit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <input 
                        className="w-full px-4 py-3 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105" 
                        type="text" 
                        placeholder='Username' 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input 
                        className="w-full px-4 py-3 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105" 
                        type="password" 
                        placeholder='Password' 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    
                    {message && (
                        <motion.p 
                            className='text-center text-color-1'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {message}
                        </motion.p>
                    )}
                    
                    <div className="flex gap-4">
                        <Button
                            className="flex-1"
                            onClick={submit}
                            type="submit"
                            name="action" 
                            value={button}
                        >
                            {button}
                        </Button>
                        {!loggedin && (
                            <Button
                                className="flex-1"
                                onClick={submit}
                                type="submit"
                                name="action" 
                                value="Register"
                                outline
                            >
                                Register
                            </Button>
                        )}
                    </div>
                    
                    <p className="text-center text-n-3">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-color-1 hover:underline">
                            Create one
                        </Link>
                    </p>
                </motion.form>
            </motion.div>
        </div>
    )
}

export default LoginComponent