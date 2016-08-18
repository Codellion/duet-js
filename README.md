<p align="center">
  <img src="https://raw.githubusercontent.com/codellion/duet-js/master/logo.PNG" width="300">
</p>
## Descripción ##
**Duet-js** es una librería javascript que permite incluir atributos dinámicos en las etiquetas HTML, además permite enlazar dichas etiquetas a valores y cálculos en tiempo real permitiendo un diseño MVVM en la capa de presentación.


## Principales características ###
La mayor característica de **duet-js** es su facilidad y baja curva de aprendizaje debido a que está construido y diseñado sobre los estándares básicos de HTML.

Sus principales características son:

- Enlace bidireccional MVVM
- Atributos HTML dinámicos
- Soporta código javascript incrustado
- Expresiones lambda
- Multiples modelos y submodelos
- No tiene ninguna dependencia de librerías
- Un peso comprimido de 25 KB
- Desarrollado en Typescript con especificaciones ES6


## Aspectos básicos ##
### Vista ###
La vista es la representación gráfica de la información que se desea mostrar, en este caso se expresa como una página HTML estándar con **duet-annotations** (`dt-{atributo_etiqueta}`) donde de forma rápida se puede extender cualquier atributo de una etiqueta HTML:

*HTML estándar*

	<span>Hola Mundo</span>

*Duet-JS*

	<span dt-innerHTML="message"></span> 


### Modelo ###
El modelo contiene tanto la información a mostrar como el comportamiento de la vista asociada. Esta formado por variables JSON y funciones javascripts sin ningún tipo de añadidos:

	<script>
		duet.bind({ message: 'Hola Mundo' });
		duet.init();
	</script>

Para enlazar un modelo tan solo es necesario incluirlo mediante el comando `bind` como se ve en el ejemplo, finalmente se realiza una llamada al método `init` para que realize el enlace entre los modelos y la vista (Se ejecutará automáticamente cuando la vista haya terminado de cargarse). Existe un único modelo general y varios submodelos que podemos aplicar a determinados componentes, para ello tan solo tenemos que especificar el nombre del submodelo al enlazarlo a la vista y marcar el componente con el modelo que lo enlaza mediante el atributo `data-dt`:

	<script>
		duet.bind({ message: 'Hola Mundo' }, 'submodel');
		duet.init();
	</script>
	<body>
		<span dt="submodel" dt-innerHTML="message"></span> 
	</body>

De esta forma todos los componentes marcados con un determinado modelo unicamente responderan antes los cambios de este, todos los que no tengan el atributo `data-dt` informados serán enlazados al modelo general siempre y cuando este se haya establecido en duet:

	<script>
		duet.bind({ message: 'Hola ' });
        duet.bind({ message: 'Mundo' }, 'submodel');
		duet.init();
	</script>
	<body>
		<span dt-innerHTML="message"></span><span dt="submodel" dt-innerHTML="message"></span> 
	</body>

Una vez que se ha realizado la inicialización de duetJS mediante el evento `init` es posible modificar no solo las propiedades de un modelo sino todo el modelo completo utilizando de nuevo el método `bind` para sobrescribir el ya existente:

	<script>
		duet.bind({ message: 'Hola ' });
        duet.bind({ 
        	message: 'Mundo',  
            newModel: function() {
            		duet.bind({ message: 'Universo' }, 'submodel');
            	}
            }, 'submodel');
		duet.init();
	</script>
	<body>
		<span dt-innerHTML="message"></span><span dt="submodel" dt-innerHTML="message"></span> 
        <input type="button" value="Actualizar modelo" dt="submodel" dt-onclick="@this.newModel()" />
	</body>

El evento `init` puede recibir como parámetro una función callback que será invocada a la finalización del inicio de duetJS.


### Bindings ###
Ahora que tenemos por un lado la vista y por otro el modelo es necesario introducir el pegamento que enlace estos dos componentes y en este punto es donde entra en juego los **duet-bindings** (`data-dt`) donde se especifica que modelo se enlaza a cada elemento de la vista:
		
	<script>
		duet.bind({ message: 'Hola Mundo' });
		duet.init();
	</script>
	<body>
		<span dt-innerHTML="message"></span> 
	</body>


Existen dos tipos de **duet-annotations**:

#### Property binding ####
Una **property binding** es un enlace directo entre la vista y el modelo, es decir, se corresponde con el nombre de una propiedad o método del componente del modelo al que se asocia.

	<script>
		var btTest = {
			name: 'Click me!',
			clickEvent: function(){ alert('Hello world!'); }
		};

		duet.bind(btTest);
		duet.init();		
	</script>
	<body>
		<input type="button" dt-value="name" dt-onclick="clickEvent">
	</body>


#### Inline binding ####
Las **inline binding** se expresan directamente en los atributos de las etiquetas empezando por **`#`** para los atributos normales y **`@`** para los eventos mediante código javascript. Estas propiedades soportan expresiones lambdas de forma independiente al motor javascript del navegador.

	<script>
		duet.bind({ name: 'Click me' });
		duet.init();
	</script>
	<body>
		<input type="button" dt-value="#this.name + '!'" 
			dt-onclick="@alert('Hello world!');">
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
		var btTest = {
			name: 'Click me!',
			fontWeight: 'normal',
			clickEvent: function(){ 
				this.fontWeight = 'bold';
				alert('Hello world!');
			}
		};

		duet.bind(btTest);
		duet.init();		
	</script>
	<body>
		<input type="button" dt-value="name" dt-onclick="clickEvent" 			
			dt-style.font-weight="fontWeight">	
		<input type="button" dt-value="#this.name + '!'" 
			dt-onclick="@alert('Hello world!');" dt-style.font-weight="#'bold'">
	</body>
		


#### Atributo Children ####
El atributo `dt-children` se utiliza para trabajar con colecciones de forma que se renderiza una lista de elementos HTML, de esta forma de puede generar contenido dinámico trabajando con una plantilla totalmente HTML estandar.

	<script>		
		var btTest = {
			name: 'Click me!',
			tasks: ['Task1','Task2','Task3'],
			clickEvent: function(){ 
				this.tasks.push('New task');
			}
		};

		duet.bind(btTest);
		duet.init();
	</script>
	<body>
		<input type="button" dt-value="name" dt-onclick="clickEvent" dt-style.font-weight="fontWeight">
	                
	    <ul dt-children="tasks">
	        <li>
	            <span dt-innerHTML="this" />
	        </li>
	    </ul>
	</body>

Como se puede comprobar para los tipos primitivos se utiliza la palabra reservada `this`, en el caso de enlazar colecciones de objetos se utilizaría la nomenclatura normal que hemos comentado más arriba:

	<script>
		var btTest = {
			name: 'Click me!',
			doneTasks: [ {index:1, name:'Task11'}, {index:2, name:'Task22'}, 
				{index:3, name:'Task33'}],
			clickEvent: function(){ 
				this.tasks.push({index:4, name:'New task'});
			}
		};

		duet.bind(btTest);
		duet.init();
	</script>
	<body>
		<ul dt-children="doneTasks">
			<li>
			    <span dt-innerHTML="index"></span> - <span dt-innerHTML="name"></span> 
			    <br />
			    <span dt-innerHTML="#this.index + ' - ' + this.name" ></span>
			</li>
		</ul>
	</body>


#### Atributo children-map ####
Como ya hemos comentado duetJS es un MVVM lo que quiere decir que soporta un enlace bidireccional entre el modelo y la vista. Este enlace también nos permite gestionar las listas de elementos que tengamos en nuestros modelos a través del atributo `children-map` que suele ir acompañando al atributo anterior `dt-children` para permitir la recreación de elementos a partir de los nodos hijos de un componente HTML.

La necesidad de utilizar este nuevo atributo en lugar de reutilizar el `dt-children` es debido a que este último permite incluir expresiones lambdas y código javascript incrustado por lo que no seríamos capaces de establecer a que propiedad del modelo hay que incluir los elementos modificados.

De este modo si incluimos esta etiqueta conseguimos que nuestra propiedad de tipo array del modelo que esta enlazado al componente se modifique en caso de que se añadan u eliminen nodos del componente padre en el HTML:

    <script type="text/javascript">
    	function addCity(){
        	var newOpt = document.createElement('option');
            newOpt.text = "Londres";
            newOpt.value = "Londres";
            document.querySelector('#selectCities').appendChild(newOpt);
        }
    
        duet.bind({ cities: ['Sevilla', 'Roma', 'Paris'] });
        duet.init();
    </script>
	<body>
		<select id="selectCities" children-map="cities" dt-children="cities">
			<option dt-text="this"></option>
		</select>
        <input type="button" value="Añadir ciudad" onclick="addCity()" />
	</body>

Como vemos en el ejemplo anterior si ejecutamos `duet.model.cities;` desde la consola del navegador veremos como en nuestro modelo también se ha incluido automáticamente la nueva opción de "Londres".

Es muy importante que la estructura que incluyamos como hija tenga los mismos componentes que la utilizada como plantilla.

(more coming soon!!!!)

#### duet API reference ####

#### Mutation binding ####
data-dt-value="chosenTicket"
this.$chosenTicket.price

#### bindings y subscripciones a cambios en el modelo
	var model = {
		"title": "Prueba REST",
		"result": "Pendiente",
		"results": [],
		"address": "San Francisco",
		"feechResults": function() {
			var _self = this;
			this.result = "En progreso",
			$.ajax({
		        url: "http://maps.googleapis.com/maps/api/geocode/json?address=" + this.address
		    }).then(function(data) {
		    	_self.result = data.status;
		       	_self.results = data.results;
		    });
		}
	};

	duet.bind(model);
	duet.init(function() {
		model.feechResults();

		duet.model._address.subscribe(function(){
	    	alert('Puto amo');
		});
	});

#### Plantillas

#### Defered - autodefered

#### ObservableArray



