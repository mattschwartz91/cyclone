import React from 'react'

const Navbar = () => {
    return (
        <div className="flex justify-center items-center h-24 max-w-full mx-auto text-cyan-100 ">
            <h1 className='w-full text-3xl font-bold text-[#FFFA8D] px-4 mx-auto'>Cyclone</h1>
            <ul className="flex">
                <li className='p-4'>Home</li>
                <li className='p-4'>Route</li>
                <li className='p-4'>Login</li>
                <li className='p-4'>Contact</li>
            </ul>
        </div>
    )
}

export default Navbar