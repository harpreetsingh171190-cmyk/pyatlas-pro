.PHONY: test lint build wheel clean

test:
	python -m unittest discover -s tests -v
	npm test

lint:
	ruff check .
	mypy

build:
	python -m pyatlas validate
	python -m pyatlas build --output dist

wheel:
	python -m pip wheel --no-deps --wheel-dir wheelhouse .

clean:
	rm -rf build *.egg-info __pycache__ pyatlas/__pycache__ tests/__pycache__
