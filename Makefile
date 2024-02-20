# MIT License
#
# Copyright (c) 2024 HTV04
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# htv04.github.io Makefile

# Phony targets
.PHONY: all pages images run clean

# Full website (default)
all: root images pages

# Pages
pages: images root/favicon.ico root/index.html
root/%.html: src/pages/%.md root
	pandoc $< -f markdown --wrap=none --template=src/pages/template.html -t html -o $@
root/favicon.ico: src/pages/favicon.ico root
	cp $< $@

# Images
images: root/images
root/images: src/pages/images root
	cp -r $< $@

# Website root
root:
	mkdir root

# Run website via Python
run: root
	python3 -m http.server -d root

# Clean
clean:
	rm -rf root
