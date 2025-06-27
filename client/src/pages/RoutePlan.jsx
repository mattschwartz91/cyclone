import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoutePlan() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to /display or wherever RouteDisplay is rendered
    navigate('/display');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-700">
      <p>Redirecting to the route display page...</p>
    </div>
  );
}