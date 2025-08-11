import React, {useState, useEffect} from 'react'

// add button, that gets response from backend
// add another button that adds a row to a SQL table



const BackendTest = () => {
    const [content, setContent] = useState('');

    // call hello world to check back end
    const HelloWord = () => {
        fetch('http://localhost:3000/')
        .then((res) => res.text())
        .then((data) => setContent(data))
        .catch((err) => console.error('Fetch error:', err));
    }

    const addSQLRow = () => {
        fetch('http://localhost:3000/add-row', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: 'Sample Data' }),
        })
        .then((res) => res.json())
        .then((data) => console.log('Row added:', data))
        .catch((err) => console.error('Fetch error:', err));
    }
    
  return (
    <>
    <div className="w-[1024px] min-h-screen">
         <div className='mt-4  bg-blue-950 p-2'>
            <button className='mr-4' onClick={HelloWord}>Hello World!</button>
            <button onClick={addSQLRow}>Add SQL Row</button>
        </div>
        <div className='mt-4'>
            <p>{content}</p>
        </div>

    </div>
       
    </>
  )
}

export default BackendTest