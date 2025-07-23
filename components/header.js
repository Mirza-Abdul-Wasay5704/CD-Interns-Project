function loadHeader() {
    document.getElementById('header').innerHTML = `
        <nav class="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
            <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <a href="index.html" class="flex items-center space-x-4 rtl:space-x-reverse">
                    <img src="assets/logos/pso.png" alt="PSO Logo" class="w-12 h-12 object-contain" />
                    <div class="flex flex-col">
                        <span class="text-3xl font-bold whitespace-nowrap">
                            <span class="text-yellow-400 font-extrabold">Smart</span>
                            <span class="text-white font-light">Trading Area</span>
                        </span>
                        <span class="text-sm text-gray-400 font-normal">Pakistan State Oil - Digital Solutions</span>
                    </div>
                </a>
                
                <div class="hidden w-full md:block md:w-auto">
                    <ul class="font-semibold flex flex-col p-4 md:p-0 mt-4 border border-gray-700 rounded-lg bg-gray-800/90 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-transparent text-lg">
                        <li><a href="index.html" class="nav-link">Home</a></li>
                        <li><a href="pages/analysis.html" class="nav-link">Analysis</a></li>
                        <li><a href="pages/map.html" class="nav-link">Map</a></li>
                        <li><a href="pages/ssm.html" class="nav-link">SSM</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    `;
}