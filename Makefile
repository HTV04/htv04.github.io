all: root/index.html

docs/index.html: root/index/index.md
	pandoc $< -f markdown -s -t html -o $@

run:
	python3 -m http.server -d root

clean:
	rm -f root/index.html
