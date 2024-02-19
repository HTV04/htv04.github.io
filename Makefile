.PHONY: all pages run clean

all: root pages

pages: root/index.html root/images

root/%.html: src/pages/%.md root
	pandoc $< -f markdown -s -t html -o $@

root/images: root
	cp -r src/pages/images root/images

root:
	mkdir root

run:
	python3 -m http.server -d root

clean:
	rm -rf root
