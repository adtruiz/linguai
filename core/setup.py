"""Setup script for linguai-core package."""

from setuptools import setup, find_packages

setup(
    name="linguai-core",
    version="0.1.0",
    description="Open-source acoustic analysis library for LinguAI",
    author="LinguAI Contributors",
    author_email="hello@linguai.app",
    url="https://github.com/adtruiz/linguai",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "numpy>=1.24.0",
        "parselmouth>=0.4.4",
    ],
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-cov>=4.0.0",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: GNU General Public License v3 (GPLv3)",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Multimedia :: Sound/Audio :: Analysis",
    ],
    license="GPL-3.0",
)
