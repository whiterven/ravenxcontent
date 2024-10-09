// Ensure this script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io();
    const form = document.getElementById('contentForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const resultContainer = document.createElement('div');
    resultContainer.id = 'resultContainer';
    form.parentNode.insertBefore(resultContainer, form.nextSibling);
  
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Disable the submit button and show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Generating...';
      
      // Clear previous results
      resultContainer.innerHTML = '';
      
      // Collect form data
      const formData = new FormData(form);
      const jsonData = {};
      for (let [key, value] of formData.entries()) {
        jsonData[key] = value;
      }
      
      // Send data to the server
      fetch('/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Generation started:', data);
        // Show a message that generation has started
        resultContainer.innerHTML = '<p>Content generation has started. Please wait...</p>';
      })
      .catch(error => {
        console.error('Error:', error);
        resultContainer.innerHTML = '<p>An error occurred while starting the generation process.</p>';
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Content';
      });
    });
  
    // Listen for real-time updates from the server
    socket.on('generation_progress', function(data) {
      console.log('Progress update:', data);
      resultContainer.innerHTML += `<p>${data.message}</p>`;
    });
  
    socket.on('generation_complete', function(data) {
        console.log('Generation complete:', data);
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Content';
        
        // Function to format the content
        function formatContent(content) {
          return content
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/\* \*\*(.+?)\*\*/g, '<li><strong>$1</strong></li>') // Bullet points with bold text
            .replace(/### (.+)/g, '<h3>$1</h3>') // Title
            .replace(/## (.+)/g, '<h2>$1</h2>') // Subtitle
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/<br><br>/g, '</p><p>'); // Paragraphs
        }
      
        // Display the final result
        resultContainer.innerHTML = `
          <h3>Generated Content:</h3>
          <div class="generated-content">
            ${formatContent(data.result.final_output)}
          </div>
        `;
        
        // If there are task outputs, display them as well
        if (data.result.task_outputs && data.result.task_outputs.length > 0) {
          const taskOutputs = data.result.task_outputs.map(task => 
            `<h4>Task ${task.task_id}:</h4><div class="task-output">${formatContent(task.output)}</div>`
          ).join('');
          resultContainer.innerHTML += `
            <h3>Task Outputs:</h3>
            ${taskOutputs}
          `;
        }
      });
  
    socket.on('generation_error', function(data) {
      console.error('Generation error:', data);
      submitButton.disabled = false;
      submitButton.textContent = 'Generate Content';
      resultContainer.innerHTML = `<p>Error: ${data.error}</p>`;
    });
  });