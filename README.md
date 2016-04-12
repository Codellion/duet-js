<p align="center">
  <img src="https://raw.githubusercontent.com/codellion/duet-js/master/logo.PNG" width="300">
</p>
## Descripción ##
**Duet-js** es una librería javascript que permite incluir atributos dinámicos en las etiquetas HTML, además permite enlazar dichas etiquetas a valores y cálculos en tiempo real permitiendo un diseño MVVM en la capa de presentación.


## Principales características ###
La mayor característica de **duet-js** es su facilidad y baja curva de aprendizaje debido a que está construido y diseñado sobre los estándares básicos de HTML.

Sus principales características son:

- Bidirectional bindings
- Dynamic HTML attributes
- Support embedded javascript code
- Lamdba expressions
- Event bindings
- No 3rd library dependencies
- Developed in Typescript with ES6


## Aspectos básicos ##
### Vista ###
La vista es la representación gráfica de la información que se desea mostrar, en este caso se expresa como una página HTML estándar con **duet-annotations** (`data-dt-{atributo_etiqueta}`) donde de forma rápida se puede extender cualquier atributo de una etiqueta HTML:

*HTML estándar*

	<span>Hola Mundo</span>

*Duet-JS*

	<span data-dt-innerHTML="message"></span> 


### Modelo ###
El modelo contiene tanto la información a mostrar como el comportamiento de la vista asociada. Esta formado por variables JSON y funciones javascripts sin ningún tipo de añadidos:

	<script>duet.bind('hello', { message: 'Hola Mundo' });</script>

### Bindings ###
Ahora que tenemos por un lado la vista y por otro el modelo es necesario introducir el pegamento que enlace estos dos componentes y en este punto es donde entra en juego los **duet-bindings** (`data-dt`) donde se especifica que modelo se enlaza a cada elemento de la vista:

	<body onload="duet.bind('hello', { message: 'Hola Mundo' });">
		<span data-dt="hello" data-dt-innerHTML="message"></span> 
	</body>


Existen dos tipos de **duet-annotations**:

#### Property binding ####
Una **property binding** es un enlace directo entre la vista y el modelo, es decir, se corresponde con el nombre de una propiedad o método del componente del modelo al que se asocia.

	<script>
		function onLoad(){
			var btTest = {
				name: 'Click me!',
				clickEvent: function(){ alert('Hello world!'); }
			};

			duet.bind('test', btTest);
		}
	</script>
	<body onload="onLoad();">
		<input type="button" data-dt="test" data-dt-value="name" data-dt-onclick="clickEvent">
	</body>


#### Inline binding ####
Las **inline binding** se expresan directamente en los atributos de las etiquetas empezando por **`#`** para los atributos normales y **`@`** para los eventos mediante código javascript. Estas propiedades soportan expresiones lambdas de forma independiente al motor javascript del navegador.

	<body onload="duet.bind('test', { name: 'Click me' });">
		<input type="button" data-dt="test" data-dt-value="#this.name + '!'" 
			data-dt-onclick="@alert('Hello world!');">
	</body>


Dentro de las **inline-binding** se puede hacer referencia al elemento al que esta enlazado mediante la palabra reservada `this`, que representa el **duet-scope** del elemento. Este ámbito contiene todos los datos necesarios para interaccionar tanto con la vista como con el modelo:

- **this**: Dentro del propio elemento `this`encontraremos todas la propiedades enlazadas al componente dentro de su propio contexto, es decir, si estamos dentro de un elemento de una lista este objecto representará el propio elemento seleccionado no el modelo completo.
- **this.view**: Representa el objecto javascript del componente HTML enlazado al **inline-binding**. 
- **this.model**: Corresponde al objeto del modelo que se encuentra enlazado a la vista.

### Special bindings ###
Exiten casos especiales en donde el enlace entre la vista y el modelo no es tan directo, estos son los **special bindings**, veamos algunos ejemplos:

#### Atributos secundarios ####
Algunos de los atributos de los componentes HTML son diccionarios de tipo clave->valor, como por ejemplo el atributo `style`, en estos casos para navegar entre los distintos niveles del arbol de propiedades se utiliza el caracter *`.`*.

	
		
	<script>
		function onLoad(){
			var btTest = {
				name: 'Click me!',
				fontWeight: 'normal',
				clickEvent: function(){ 
					this.fontWeight = 'bold';
					alert('Hello world!');
				}
			};

			duet.bind('test', btTest);
		}
	</script>
	<body onload="onLoad();">
		<input type="button" data-dt="test" data-dt-value="name" data-dt-onclick="clickEvent" 			
			data-dt-style.font-weight="fontWeight">	
		<input type="button" data-dt="test" data-dt-value="#this.name + '!'" 
			data-dt-onclick="@alert('Hello world!');" data-dt-style.font-weight="#'bold'">
	</body>
		


#### Atributo Children ####
El atributo `data-dt-children` se utiliza para trabajar con colecciones de forma que se renderiza una lista de elementos HTML, de esta forma de puede generar contenido dinámico trabajando con una plantilla totalmente HTML estandar, los elementos que queramos enlazar con **duet-js** contenidos en dicha plantilla deberán contener la etiqueta `data-dt="children"`.

	<script>
		function onLoad(){
			var btTest = {
				name: 'Click me!',
				tasks: ['Task1','Task2','Task3'],
				clickEvent: function(){ 
					this.tasks.push('New task');
				}
			};

			duet.bind('test', btTest);
		}
	</script>
	<body onload="onDocLoad();">
		<input type="button" data-dt="test" data-dt-value="name" data-dt-onclick="clickEvent" data-dt-style.font-weight="fontWeight">
	                
	    <ul data-dt="test" data-dt-children="tasks">
	        <li>
	            <span data-dt="children" data-dt-innerHTML="this" />
	        </li>
	    </ul>
	</body>

Como se puede comprobar para los tipos primitivos se utiliza la palabra reservada `this`, en el caso de enlazar colecciones de objetos se utilizaría la nomenclatura normal que hemos comentado más arriba:

	<script>
		function onLoad(){
			var btTest = {
				name: 'Click me!',
				doneTasks: [ {index:1, name:'Task11'}, {index:2, name:'Task22'}, {index:3, name:'Task33'}],
				clickEvent: function(){ 
					this.tasks.push({index:4, name:'New task'});
				}
			};

			duet.bind('test', btTest);
		}
	</script>
	<body onload="onDocLoad();">
		<ul data-dt="test" data-dt-children="doneTasks">
			<li>
		            <span data-dt="children" data-dt-innerHTML="index"></span> - <span data-dt="children" data-dt-innerHTML="name"></span> <br />
		            <span data-dt="children" data-dt-innerHTML="#this.index + ' - ' + this.name" ></span>
		        </li>
		</ul>
	</body>


(more coming soon)



