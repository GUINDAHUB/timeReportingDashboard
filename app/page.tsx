import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ¡Bienvenido a Guinda Time Tracking! 🍒
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Sistema de análisis de rentabilidad para tu agencia de marketing
                </p>

                <div className="grid gap-6 md:grid-cols-3 mt-12 max-w-5xl mx-auto">
                    <Link
                        href="/dashboard"
                        className="group p-8 rounded-xl border-2 bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-400 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                    >
                        <div className="text-5xl mb-4">📊</div>
                        <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-blue-700">Dashboard</h3>
                        <p className="text-gray-600 group-hover:text-gray-800">
                            Visualiza KPIs mensuales y rentabilidad por cliente
                        </p>
                    </Link>

                    <Link
                        href="/trends"
                        className="group p-8 rounded-xl border-2 bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-400 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                    >
                        <div className="text-5xl mb-4">📈</div>
                        <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-purple-700">Tendencias</h3>
                        <p className="text-gray-600 group-hover:text-gray-800">
                            Analiza la evolución histórica de ingresos y costes
                        </p>
                    </Link>

                    <Link
                        href="/import"
                        className="group p-8 rounded-xl border-2 bg-white hover:bg-green-50 border-green-200 hover:border-green-400 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                    >
                        <div className="text-5xl mb-4">📤</div>
                        <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-green-700">Importar CSV</h3>
                        <p className="text-gray-600 group-hover:text-gray-800">
                            Carga tus datos mensuales de ClickUp
                        </p>
                    </Link>
                </div>

                <div className="mt-16 p-8 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold mb-6 text-gray-900">✅ Setup Completado</h2>
                    <p className="text-lg text-gray-700 mb-4">
                        ¡Perfecto! Ya tienes todo configurado. Ahora puedes:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-left">
                        <div className="flex items-start space-x-3">
                            <span className="text-2xl">👥</span>
                            <div>
                                <h4 className="font-semibold text-gray-900">Gestionar Clientes</h4>
                                <p className="text-sm text-gray-600">Ve a <Link href="/clients" className="text-blue-600 hover:underline">Clientes</Link> para ver tus 9 clientes</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <span className="text-2xl">📊</span>
                            <div>
                                <h4 className="font-semibold text-gray-900">Ver Dashboard</h4>
                                <p className="text-sm text-gray-600">Explora el <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link> con métricas</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <span className="text-2xl">📤</span>
                            <div>
                                <h4 className="font-semibold text-gray-900">Importar Datos</h4>
                                <p className="text-sm text-gray-600">Sube tu <Link href="/import" className="text-blue-600 hover:underline">CSV de ClickUp</Link></p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <span className="text-2xl">📈</span>
                            <div>
                                <h4 className="font-semibold text-gray-900">Analizar Tendencias</h4>
                                <p className="text-sm text-gray-600">Revisa <Link href="/trends" className="text-blue-600 hover:underline">evolución temporal</Link></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-sm text-muted-foreground">
                    <p>Versión 1.0.0 • Desarrollado con ❤️ para Guinda Marketing</p>
                </div>
            </div>
        </div>
    )
}
