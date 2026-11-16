document.addEventListener('DOMContentLoaded', function () {
    const formEditar = document.getElementById('formEditarObra');
    
    if (formEditar) {
        formEditar.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const obraId = formEditar.getAttribute('data-obra-id');

            fetch(`/obras/editar/?id=${obraId}`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    alert('¡Orden actualizada con éxito!');
                    window.location.href = `/obras/detalle/?id=${obraId}`;
                } else {
                    alert(data.error || 'Error al actualizar.');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert('Ocurrió un error inesperado al actualizar la orden.');
            });
        });
    }
});