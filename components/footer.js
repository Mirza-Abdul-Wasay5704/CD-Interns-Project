function loadFooter() {
    document.getElementById('footer').innerHTML = `
        <footer class="bg-gray-800 border-t border-gray-700 mt-20">
            <div class="max-w-screen-xl mx-auto px-6 py-8">
                <div class="flex flex-col md:flex-row justify-between items-center">
                    <div class="flex items-center space-x-4 mb-4 md:mb-0">
                        <div class="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                            <svg class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                            </svg>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-white">Pakistan State Oil</div>
                            <div class="text-sm text-gray-400">Channel Development Department</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4 text-sm text-gray-400">
                        <div class="flex items-center space-x-2">
                            <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                            </svg>
                            <span class="text-green-400">support@pso.com.pk</span>
                        </div>
                    </div>
                </div>
                <div class="border-t border-gray-700 mt-6 pt-6 text-center">
                    <p class="text-sm text-gray-500">
                        © 2025 Pakistan State Oil Company Limited • Powered by AI • Secure & ISO Compliant
                    </p>
                </div>
            </div>
        </footer>
    `;
}