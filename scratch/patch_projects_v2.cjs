const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'ProjectsV2.tsx');
let fileContent = fs.readFileSync(filePath, 'utf8');

// Replace all instances where 'hoardings' is used as projectType comparison or value
// 1. let templates = ... if (projectType === 'hoardings')
fileContent = fileContent.replace("if (projectType === 'hoardings')", "if (projectType === 'project_hoarding')");

// 2. projectType: 'hoardings' under initial states
fileContent = fileContent.replace("projectType: 'hoardings',", "projectType: 'project_hoarding',");
// replace second occurrence as well
fileContent = fileContent.replace("projectType: 'hoardings',", "projectType: 'project_hoarding',");

// 3. concreteStyle: result.projectType === 'hoardings'
fileContent = fileContent.replace("concreteStyle: result.projectType === 'hoardings'", "concreteStyle: result.projectType === 'project_hoarding'");
fileContent = fileContent.replace("concreteStyle: result.projectType === 'hoardings'", "concreteStyle: result.projectType === 'project_hoarding'");

// 4. newProject.projectType === 'hoardings' in UI checks
fileContent = fileContent.replace("newProject.projectType === 'hoardings'", "newProject.projectType === 'project_hoarding'");
fileContent = fileContent.replace("newProject.projectType === 'hoardings'", "newProject.projectType === 'project_hoarding'");

fs.writeFileSync(filePath, fileContent, 'utf8');
console.log("Successfully patched src/components/ProjectsV2.tsx!");
