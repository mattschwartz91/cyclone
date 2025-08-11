import LoginComponent from '../components/LoginComponent'
import Header from '../components/Header'
import ButtonGradient from '../assets/svg/ButtonGradient'

const Login = () => {
  return (
    <>
      <div className="pt-[4.75rem] lg:pt-[6.25rem] overflow-hidden">
        <Header/>
        <div className="min-h-screen bg-gradient-to-br from-n-8 via-n-7 to-n-6 flex items-center justify-center p-4">
          <LoginComponent/>
        </div>
      </div>
      <ButtonGradient />
    </>
  )
}

export default Login
