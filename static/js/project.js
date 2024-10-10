document.addEventListener('DOMContentLoaded', function() {
    const projectList = document.getElementById('projectList');
    const userFullName = document.getElementById('user-fullname');

    // Fetch user information and projects
    fetch('/api/dashboard')
        .then(response => response.json())
        .then(data => {
            userFullName.textContent = data.user_info.full_name;
            fetchProjects();
        })
        .catch(error => console.error('Error fetching user info:', error));

    function fetchProjects() {
        fetch('/api/projects')
            .then(response => response.json())
            .then(data => {
                displayProjects(data.projects);
            })
            .catch(error => console.error('Error fetching projects:', error));
    }

    function displayProjects(projects) {
        projectList.innerHTML = '';
        if (projects.length === 0) {
            projectList.innerHTML = '<p class="col-12">No projects found. Start generating content to see your projects here!</p>';
            return;
        }

        projects.forEach(project => {
            const projectCard = createProjectCard(project);
            projectList.appendChild(projectCard);
        });
    }

    function createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'col-lg-4 col-md-6 mb-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${project.title}</h5>
                    <p class="card-text">Type: ${project.content_type}</p>
                    <p class="card-text">Created: ${new Date(project.created_at).toLocaleDateString()}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary view-btn" data-id="${project.id}">View</button>
                    <button class="btn btn-secondary edit-btn" data-id="${project.id}">Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${project.id}">Delete</button>
                </div>
            </div>
        `;

        // Add event listeners to buttons
        card.querySelector('.view-btn').addEventListener('click', () => viewProject(project.id));
        card.querySelector('.edit-btn').addEventListener('click', () => editProject(project.id));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteProject(project.id));

        return card;
    }

    function viewProject(projectId) {
        window.location.href = `/view-content/${projectId}`;
    }

    function editProject(projectId) {
        // Implement edit functionality or redirect to edit page
        console.log('Edit project:', projectId);
        // For now, we'll just alert the user
        alert('Edit functionality coming soon!');
    }

    function deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project?')) {
            fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchProjects(); // Refresh the project list
                } else {
                    alert('Failed to delete project. Please try again.');
                }
            })
            .catch(error => console.error('Error deleting project:', error));
        }
    }

    // Add event listener for creating a new project
    const newProjectBtn = document.createElement('button');
    newProjectBtn.className = 'btn btn-success mb-4';
    newProjectBtn.textContent = 'Create New Project';
    newProjectBtn.addEventListener('click', () => {
        window.location.href = '/content';
    });
    projectList.parentNode.insertBefore(newProjectBtn, projectList);
});