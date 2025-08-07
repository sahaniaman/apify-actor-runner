#  Apify Actor Runner

A modern, feature-rich web application for running Apify actors with an intuitive interface, real-time monitoring, and comprehensive result visualization.

## ✨ Features

### 🔐 Authentication
- Secure API key validation with Apify
- Persistent login sessions
- User profile information display

### 🎭 Actor Management
- Browse public actors from Apify Store
- Access your private actors
- Search and filter capabilities
- Category-based filtering for public actors
- Actor details with schema visualization

### ⚙️ Input Configuration
- **Visual Editor**: User-friendly form generation from JSON schema
- **JSON Editor**: Direct JSON input with syntax validation
- Support for all schema types (string, number, boolean, array, object)
- Default value pre-population
- Input validation and error handling

### 🏃‍♂️ Execution & Monitoring
- Asynchronous actor execution
- Real-time status monitoring
- Progress indicators with visual feedback
- Detailed execution statistics

### 📊 Results Visualization
- **Preview Mode**: Tabular data display
- **Raw Data**: Formatted JSON output
- **Statistics**: Execution metrics and data insights
- Download results as JSON
- Responsive data tables with pagination

### 🎨 Modern UI/UX
- Clean, minimal design with Inter font
- Responsive layout for all devices
- Dark mode support (auto-detection)
- Toast notifications for user feedback
- Loading states and error handling
- Smooth animations and transitions

### 🛡️ Security & Performance
- Rate limiting protection
- Request timeout handling
- Input sanitization
- Error boundary implementations
- Optimized API calls with caching

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm
- Apify account with API key

### Installation
1. Clone the repository
    ```bash
    git clone https://github.com/sahaniaman/apify-actor-runner.git
    cd apify-actor-runner
    ```

2. Install dependencies
    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory with your Apify API key
    ```


### Running the Application
1. Start the development server
    ```bash
    npm start
    ```

2. Open your browser and navigate to `http://localhost:3000`

## 📝 Testing Information

### Test Actor
For testing purposes, we used the "Website Content Crawler" actor from the Apify store, which allows crawling and extracting data from websites with configurable depth and content filters.

### Design Choices & Assumptions
- **React Framework**: Chosen for its component-based architecture and efficient rendering
- **Context API**: Used for global state management instead of Redux for simplicity
- **Modular Design**: Components are highly reusable and follow single responsibility principle
- **API Caching**: Implemented to minimize requests to Apify API
- **Assumption**: Users have basic familiarity with JSON structure for manual input mode

## 📸 Application Workflow

The application follows this general workflow:
1. Login with Apify API key
2. Browse and select an actor
3. Configure actor input parameters
4. Run the actor and monitor execution
5. View and analyze results

