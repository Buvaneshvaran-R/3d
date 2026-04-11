# Three.js Buildings Project

This project is a Three.js application that procedurally generates three distinct buildings with specified designs and materials. The buildings are created using JavaScript and rendered in a web browser.

## Project Structure

```
threejs-buildings-project
├── src
│   ├── main.js               # Entry point of the application
│   ├── buildings             # Contains building construction files
│   │   ├── buildingOne.js    # Creates the Modern Academic Block
│   │   ├── buildingTwo.js    # Creates the Institutional Main Block
│   │   └── buildingThree.js   # Creates the Auditorium Block
│   ├── materials             # Contains material configurations
│   │   └── index.js          # Exports MeshStandardMaterial configurations
│   └── index.html            # HTML structure for the project
├── package.json              # npm configuration file
├── vite.config.js            # Vite configuration file
└── README.md                 # Project documentation
```

## Building Overview

1. **Modern Academic Block**: 
   - Constructed using BoxGeometry for the structure and PlaneGeometry for the windows.
   - Features a white concrete structure with 4 floors and a symmetric design.

2. **Institutional Main Block**: 
   - A large wide structure with a central entrance and 3 floors.
   - Designed with light beige/white walls and repetitive vertical window columns, maintaining a balanced symmetry.

3. **Auditorium Block**: 
   - Features a low height with a triangular sloped red roof and a large glass front facade.
   - Includes side concrete walls and central entrance glass doors, ensuring a modern auditorium style with a symmetrical layout.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd threejs-buildings-project
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and go to `http://localhost:3000` to view the project.

## Technologies Used

- Three.js: A JavaScript library for creating 3D graphics in the browser.
- Vite: A build tool that provides a fast development environment.

## License

This project is licensed under the MIT License.