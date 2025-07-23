import React, {useState, useEffect} from 'react'

const LoginComponent = () => {
        
        // hooks for username, password, and errors during form submission
        const [username, setUsername] = useState("");
        const [password, setPassword] = useState("");
        const [message, setMessage] = useState("");
        const [loggedin, setLoggedin] = useState(false);
        const [button, setButton] = useState("");

        // update login button based on login state
        useEffect(() => {
            fetch('http://192.168.1.24/api/status', { credentials: 'include' })
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
                    const res = await fetch('http://192.168.1.24/api/login', {
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
                    const res = await fetch('http://192.168.1.24/api/logout', {
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
                    const res = await fetch('http://192.168.1.24/api/register', {
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

        <div className='flex flex-col justify-center items-center font-medium'>
            <div className='backdrop-blur border border-white p-4 rounded shadow-md items-center space-y-10'>
                <h1 className='p-4 pb-2 text-center items-center text-white'>Cyclone Login</h1>
                <form className='w-100 flex flex-col pl-4 pr-4 rounded-2xl font-medium'
                onSubmit={submit}>
                        <input className="w-72 mx-auto outline outline-white mb-4 rounded bg-center p-2" type="text" placeholder='Username' value={username}
                        onChange={(e) => setUsername(e.target.value)}/>
                        <input className="w-72 mx-auto outline outline-white mb-4 rounded my-2 p-2" type="password" placeholder='Password' value ={password}
                        onChange={(e) => setPassword(e.target.value)}/>
                        <p className='text-center'>{message}</p>
                        <div className="flex">
                            <input className="w-36 mx-auto block outline outline-white my-2 bg-blue-500 hover:bg-blue-400 rounded text-white p-2" 
                                type="submit" name="action" value={button}/>
                            {!loggedin && (<input className="w-36 mx-auto block outline outline-white my-2 bg-blue-500 hover:bg-blue-400 rounded text-white p-2 " 
                                type="submit" name="action" value="Register"/>)}
                        </div>
                </form>
            </div>
        </div>
 
    )
}

export default LoginComponent