import React from 'react'
import Navbar from "./components/Navbar"
import Map from "./components/Map"
import Button from "./components/GenerateButton"

function App() {

    return (
        <>
        <Navbar/>
        <div className="justify-center p-4">
            <Map/>
            <Button/>
        </div>
            
        </>

    )
}

export default App
