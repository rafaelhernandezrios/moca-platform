import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { getStoredUser } from '../lib/auth';

export default function LandingPage() {
    const user = getStoredUser();
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-grow pt-16">
                {/* HERO SECTION */}
                <section className="relative bg-gradient-to-br from-brand-50 to-white overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="text-center lg:text-left">
                                <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-100 mb-6">
                                    <span>Plataforma Clínica Segura</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
                                    Evaluación Cognitiva MoCA <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">Digital y Profesional</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
                                    La herramienta estándar para la detección de deterioro cognitivo, ahora digitalizada para una aplicación precisa, segura y accesible.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                    <Button href="/tests/demo/visuospatial" size="lg" className="w-full sm:w-auto shadow-lg shadow-brand-500/20">
                                        Iniciar Evaluación
                                    </Button>
                                    <Button href={user ? "/dashboard" : "/login"} variant="secondary" size="lg" className="w-full sm:w-auto">
                                        Acceso Profesional
                                    </Button>
                                </div>
                                <p className="mt-6 text-sm text-slate-500">
                                    * Datos encriptados y confidenciales. Cumplimiento con estándares de salud.
                                </p>
                            </div>
                            <div className="hidden lg:block">
                                <img
                                    src="/hero.png"
                                    alt="Ilustración de evaluación cognitiva digital con inteligencia artificial"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOR WHOM */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">¿Para quién es esta plataforma?</h2>
                            <p className="mt-4 text-slate-600">Diseñada pensando en las necesidades específicas de pacientes y especialistas.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            <Card className="hover:border-brand-300">
                                <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 mb-6">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">Pacientes y Usuarios</h3>
                                <p className="text-slate-600 mb-6">
                                    Realice su evaluación cognitiva desde la comodidad de su hogar con una interfaz amigable y guiada paso a paso.
                                </p>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center text-sm text-slate-600">
                                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2"></span>
                                        Interfaz clara y sin distracciones
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600">
                                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2"></span>
                                        Guía auditiva y visual
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600">
                                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2"></span>
                                        Resultados confidenciales
                                    </li>
                                </ul>
                                <Button href="/tests/demo/visuospatial" fullWidth variant="outline">Comenzar como Paciente</Button>
                            </Card>

                            <Card className="hover:border-brand-300">
                                <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 mb-6">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">Profesionales de Salud</h3>
                                <p className="text-slate-600 mb-6">
                                    Administre pruebas, monitoree el progreso de sus pacientes y genere reportes clínicos detallados automáticamente.
                                </p>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center text-sm text-slate-600">
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-2"></span>
                                        Dashboard de pacientes
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600">
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-2"></span>
                                        Calificación automática preliminar
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600">
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-2"></span>
                                        Exportación de reportes PDF
                                    </li>
                                </ul>
                                <Button href={user ? "/dashboard" : "/login"} fullWidth variant="outline">Acceso Profesional</Button>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section id="about" className="py-20 bg-slate-50 border-y border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">¿Cómo funciona?</h2>
                            <p className="mt-4 text-slate-600">Un proceso simple y estructurado en tres pasos.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8 text-center">
                            <div className="relative">
                                <div className="w-16 h-16 bg-white border-2 border-brand-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-brand-600 mx-auto mb-6 shadow-sm z-10 relative">1</div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">Registro e Identificación</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Ingrese sus datos básicos o inicie sesión con sus credenciales médicas para asegurar la correcta asignación de la prueba.
                                </p>
                            </div>
                            <div className="relative">
                                <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-slate-200 -z-0 transform -translate-x-1/2"></div>
                                <div className="w-16 h-16 bg-white border-2 border-brand-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-brand-600 mx-auto mb-6 shadow-sm z-10 relative">2</div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">Aplicación del Test</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Complete los ejercicios interactivos de memoria, atención y lenguaje guiado por nuestra interfaz inteligente.
                                </p>
                            </div>
                            <div className="relative">
                                <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-slate-200 -z-0 transform -translate-x-1/2"></div>
                                <div className="w-16 h-16 bg-white border-2 border-brand-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-brand-600 mx-auto mb-6 shadow-sm z-10 relative">3</div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">Resultados y Reporte</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Los resultados son procesados y enviados al profesional de salud para su revisión clínica y diagnóstico.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECURITY */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-brand-900 rounded-2xl p-8 md:p-12 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-brand-800 rounded-full opacity-50 blur-3xl"></div>
                            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                                <div>
                                    <h2 className="text-3xl font-bold mb-6">Seguridad y Confidencialidad</h2>
                                    <p className="text-brand-100 mb-6 leading-relaxed">
                                        Entendemos la importancia de la privacidad en el entorno médico. Nuestra plataforma implementa estrictos protocolos de seguridad para proteger la información sensible.
                                    </p>
                                    <ul className="space-y-4">
                                        <li className="flex items-center">
                                            <svg className="w-5 h-5 text-brand-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Encriptación de datos de extremo a extremo
                                        </li>
                                        <li className="flex items-center">
                                            <svg className="w-5 h-5 text-brand-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Control de acceso basado en roles estrictos
                                        </li>
                                        <li className="flex items-center">
                                            <svg className="w-5 h-5 text-brand-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Cumplimiento con normativas de protección de datos
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex justify-center">
                                    <div className="bg-brand-800 p-8 rounded-xl border border-brand-700 max-w-sm w-full">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-sm text-brand-200">Estado del Sistema</div>
                                                <div className="font-semibold text-white">Seguro y Encriptado</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-brand-300">
                                            Todas las sesiones son privadas. El acceso a los resultados está restringido únicamente al personal médico autorizado.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="py-20 bg-slate-50">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">Preguntas Frecuentes</h2>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    q: "¿Cuánto tiempo toma realizar la prueba?",
                                    a: "El test MoCA suele completarse en aproximadamente 10 a 15 minutos, dependiendo del ritmo del usuario."
                                },
                                {
                                    q: "¿Es este un diagnóstico médico definitivo?",
                                    a: "No. El MoCA es una herramienta de cribado (screening). Un resultado por debajo de lo normal sugiere la necesidad de una evaluación más profunda, pero no constituye un diagnóstico de enfermedad por sí mismo."
                                },
                                {
                                    q: "¿Mis datos son privados?",
                                    a: "Absolutamente. Utilizamos protocolos de seguridad estándar de la industria. Solo usted y su profesional de salud autorizado tienen acceso a los detalles de su prueba."
                                },
                                {
                                    q: "¿Puedo realizar la prueba desde mi celular?",
                                    a: "Sí, la plataforma es compatible con dispositivos móviles, aunque recomendamos el uso de una tablet o computadora para una mejor experiencia visual en los ejercicios de dibujo."
                                },
                                {
                                    q: "¿Qué sucede si no puedo completar una sección?",
                                    a: "El sistema le guiará. Si no puede responder, puede continuar a la siguiente sección. El profesional evaluará el contexto de las respuestas omitidas."
                                },
                                {
                                    q: "¿Necesito estar acompañado?",
                                    a: "Idealmente, la prueba debe realizarse en un lugar tranquilo y sin distracciones. Si es un paciente realizándola remotamente, asegúrese de estar cómodo y solo, a menos que requiera asistencia técnica."
                                }
                            ].map((faq, i) => (
                                <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{faq.q}</h3>
                                    <p className="text-slate-600">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
