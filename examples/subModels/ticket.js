function Ticket(name, price){
	return {
		name: name,
		price: price,
		printme: function() {
			return "Opción " + this.name;
		}
	}
}